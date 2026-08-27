import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchTeam, PlayerType } from "@/types/supabase";

// See types/supabase.ts for why this isn't `SupabaseClient<Database>`.
type TypedClient = SupabaseClient;

export type QueuePlayer = {
  id: string;
  name: string;
  type: PlayerType;
  defRating: number | null;
  midRating: number | null;
  atkRating: number | null;
  speedRating: number | null;
  staminaRating: number | null;
};

export type QueueEntry = {
  presenceId: string;
  playerId: string;
  checkInTimestamp: string;
  /** Matches played today *in this session* — the primary FIFO sort key
   * (see `getQueue`) and also what the tapa-buraco ranking and the "⚽ N"
   * badge in the queue boards key off. */
  gamesPlayedToday: number;
  player: QueuePlayer;
};

/** Mensalista before diarista — the tie-break category used by both
 * `getQueue`'s ordering and the tapa-buraco ranking in
 * app/actions/match.ts. */
function typePriority(type: PlayerType): number {
  return type === "mensalista" ? 0 : 1;
}

/** One player's spot on a roster being sent to `createMatch`. */
export type RosterEntry = {
  playerId: string;
  /** Tapa-buraco fill-in: played this match, but it shouldn't count toward
   * their real per-day tally (see `createMatch`). */
  isCompleting?: boolean;
};

export function toRoster(playerIds: string[]): RosterEntry[] {
  return playerIds.map((playerId) => ({ playerId }));
}

/** Summed across all 5 scouting metrics — "força" of a quadro/team is the
 * total of Defesa, Meio, Ataque, Velocidade e Resistência. */
export function sumRatings(players: QueuePlayer[]) {
  return players.reduce(
    (totals, player) => ({
      def: totals.def + (player.defRating ?? 0),
      mid: totals.mid + (player.midRating ?? 0),
      atk: totals.atk + (player.atkRating ?? 0),
      speed: totals.speed + (player.speedRating ?? 0),
      stamina: totals.stamina + (player.staminaRating ?? 0),
    }),
    { def: 0, mid: 0, atk: 0, speed: 0, stamina: 0 },
  );
}

/**
 * The FIFO waiting queue: every player checked in at the field who is not
 * currently tied to an in-progress match, ordered by arrival time.
 *
 * Ordering (and eligibility) is driven *exclusively* by `check_in_timestamp`
 * — the moment the admin physically checks a player in at the field on
 * Sunday. `rsvp_timestamp` (how fast someone confirmed during the week) has
 * no bearing on match rotation; a player without a `check_in_timestamp`
 * hasn't checked in yet and is excluded from the queue/draw entirely.
 *
 * `session_presences` has a real UNIQUE(session_id, player_id) constraint —
 * a player has exactly one row per session, created once by `rsvp.ts`
 * (which explicitly rejects a second RSVP for the same session/player) and
 * mutated from then on. Rotation (see `requeuePlayers`) sends a player to
 * the back of the line by *upserting* onto that same row's
 * `check_in_timestamp`, never by inserting a second one — the de-dupe below
 * is just cheap insurance for that invariant, not a real multi-row case.
 *
 * Sort order (strict hierarchy — each level only breaks ties left by the
 * one before it):
 *   1. `games_played_today` ascending — whoever has played least today.
 *   2. Category — mensalista before diarista.
 *   3. `check_in_timestamp` ascending — whoever arrived first.
 * This is the priority ranking used everywhere someone needs "who should
 * play next": the queue boards and the tapa-buraco suggestions.
 */
export async function getQueue(
  supabase: TypedClient,
  sessionId: string,
): Promise<QueueEntry[]> {
  const { data: presences, error: presencesError } = await supabase
    .from("session_presences")
    .select(
      "id, player_id, check_in_timestamp, games_played_today, players(id, name, type, def_rating, mid_rating, atk_rating, speed_rating, stamina_rating)",
    )
    .eq("session_id", sessionId)
    .eq("status", "checked_in_field")
    .not("check_in_timestamp", "is", null)
    .overrideTypes<
      Array<{
        id: string;
        player_id: string;
        check_in_timestamp: string | null;
        games_played_today: number | null;
        players: {
          id: string;
          name: string;
          type: PlayerType;
          def_rating: number | null;
          mid_rating: number | null;
          atk_rating: number | null;
          speed_rating: number | null;
          stamina_rating: number | null;
        } | null;
      }>,
      { merge: false }
    >();

  if (presencesError) {
    throw new Error("Erro ao carregar a fila de espera.");
  }

  const { data: activeMatches, error: activeMatchesError } = await supabase
    .from("matches")
    .select("id")
    .eq("session_id", sessionId)
    .eq("status", "in_progress");

  if (activeMatchesError) {
    throw new Error("Erro ao verificar partidas em andamento.");
  }

  const activeMatchIds = (activeMatches ?? []).map((match) => match.id);

  let playingPlayerIds = new Set<string>();
  if (activeMatchIds.length > 0) {
    const { data: participations, error: participationsError } =
      await supabase
        .from("match_participations")
        .select("player_id")
        .in("match_id", activeMatchIds);

    if (participationsError) {
      throw new Error("Erro ao verificar jogadores em campo.");
    }

    playingPlayerIds = new Set(
      (participations ?? []).map((p) => p.player_id),
    );
  }

  type PresenceRow = NonNullable<typeof presences>[number];

  // De-dupe by player, keeping the most recent check-in.
  const latestByPlayer = new Map<string, PresenceRow>();
  for (const presence of presences ?? []) {
    if (!presence.check_in_timestamp || !presence.players) continue;
    const current = latestByPlayer.get(presence.player_id);
    if (
      !current ||
      !current.check_in_timestamp ||
      presence.check_in_timestamp > current.check_in_timestamp
    ) {
      latestByPlayer.set(presence.player_id, presence);
    }
  }

  return Array.from(latestByPlayer.values())
    .filter((presence) => !playingPlayerIds.has(presence.player_id))
    .sort((a, b) => {
      const gamesDiff = (a.games_played_today ?? 0) - (b.games_played_today ?? 0);
      if (gamesDiff !== 0) return gamesDiff;

      const typeDiff = typePriority(a.players!.type) - typePriority(b.players!.type);
      if (typeDiff !== 0) return typeDiff;

      return (a.check_in_timestamp ?? "").localeCompare(b.check_in_timestamp ?? "");
    })
    .map((presence) => ({
      presenceId: presence.id,
      playerId: presence.player_id,
      checkInTimestamp: presence.check_in_timestamp as string,
      gamesPlayedToday: presence.games_played_today ?? 0,
      player: {
        id: presence.players!.id,
        name: presence.players!.name,
        type: presence.players!.type,
        defRating: presence.players!.def_rating,
        midRating: presence.players!.mid_rating,
        atkRating: presence.players!.atk_rating,
        speedRating: presence.players!.speed_rating,
        staminaRating: presence.players!.stamina_rating,
      },
    }));
}

/**
 * Sends players to the back of the queue by stamping a fresh
 * `check_in_timestamp` on `timestamp`.
 *
 * This MUST be an upsert, not a plain insert: `session_presences` has a
 * live UNIQUE(session_id, player_id) constraint, and every player passed
 * here already has a row from their original check-in (`checkInPlayer`) or
 * RSVP (`rsvp.ts`). A plain `.insert()` therefore always violates that
 * constraint and throws `23505` on the very first requeue of any match —
 * win/loss and draw alike, since both paths call this with the players
 * being sent back. `onConflict` targets that same constraint so this
 * updates the player's one existing row in place instead of trying (and
 * failing) to add a second one. `games_played_today` and `rsvp_timestamp`
 * aren't in `rows`, so upserting leaves them untouched.
 */
export async function requeuePlayers(
  supabase: TypedClient,
  sessionId: string,
  playerIds: string[],
  timestamp: string,
) {
  if (playerIds.length === 0) return;

  const rows = playerIds.map((playerId) => ({
    session_id: sessionId,
    player_id: playerId,
    status: "checked_in_field" as const,
    check_in_timestamp: timestamp,
  }));

  const { error } = await supabase
    .from("session_presences")
    .upsert(rows, { onConflict: "session_id,player_id" });
  if (error) {
    throw new Error("Erro ao devolver jogadores para a fila.");
  }
}

/**
 * Creates a new in-progress match with two rosters of 6 players each.
 * Entries flagged `isCompleting` (tapa-buraco fill-ins) are recorded as
 * such on `match_participations` and excluded from the `games_played_today`
 * increment below, so a fill-in appearance doesn't inflate their real tally.
 */
export async function createMatch(
  supabase: TypedClient,
  sessionId: string,
  teamA: RosterEntry[],
  teamB: RosterEntry[],
): Promise<string> {
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .insert({
      session_id: sessionId,
      status: "in_progress",
      team_a_name: "Time A",
      team_b_name: "Time B",
    })
    .select("id")
    .single();

  if (matchError || !match) {
    throw new Error("Erro ao criar a partida.");
  }

  const participations: {
    match_id: string;
    player_id: string;
    team: MatchTeam;
    is_completing: boolean;
  }[] = [
    ...teamA.map((entry) => ({
      match_id: match.id,
      player_id: entry.playerId,
      team: "team_a" as const,
      is_completing: entry.isCompleting ?? false,
    })),
    ...teamB.map((entry) => ({
      match_id: match.id,
      player_id: entry.playerId,
      team: "team_b" as const,
      is_completing: entry.isCompleting ?? false,
    })),
  ];

  const { error: participationsError } = await supabase
    .from("match_participations")
    .insert(participations);

  if (participationsError) {
    console.error("ERRO SUPABASE INICIAR PARTIDA:", participationsError);

    // Manual rollback — `matches` and `match_participations` are two
    // separate inserts, not one transaction, so a failure here would
    // otherwise leave an orphaned "in_progress" match with zero players
    // behind on every failed attempt (exactly what happened before this
    // fix: 4 phantom matches accumulated in production from repeated
    // failed starts, one of them silently blocking /admin/campo by
    // duplicating the "current match" row). Delete it before returning,
    // so a failed start never leaves a trace.
    const { error: rollbackError } = await supabase
      .from("matches")
      .delete()
      .eq("id", match.id);

    if (rollbackError) {
      // Surfaced separately — if this fails, the orphaned match survives
      // and needs manual cleanup, which is worth knowing even though the
      // original error is still what gets reported to the caller.
      console.error(
        `ERRO SUPABASE ROLLBACK PARTIDA (partida ${match.id} pode ter sobrado orfa):`,
        rollbackError,
      );
    }

    throw new Error("Erro ao escalar os times da partida.");
  }

  const countingPlayerIds = [...teamA, ...teamB]
    .filter((entry) => !entry.isCompleting)
    .map((entry) => entry.playerId);

  await incrementGamesPlayed(supabase, sessionId, countingPlayerIds);

  return match.id;
}

/**
 * Marks `playerIds` as having played one more match today: reads each
 * player's current count and writes count+1 onto their `session_presences`
 * row. `session_presences` is one row per (session, player) by constraint
 * (see `getQueue`), so "most recent row" is really just "the row" — this
 * stays defensive rather than assuming that, in case it's ever queried
 * before the player's row exists.
 */
async function incrementGamesPlayed(
  supabase: TypedClient,
  sessionId: string,
  playerIds: string[],
) {
  if (playerIds.length === 0) return;

  const { data: rows, error } = await supabase
    .from("session_presences")
    .select("id, player_id, check_in_timestamp, games_played_today")
    .eq("session_id", sessionId)
    .in("player_id", playerIds);

  if (error) {
    throw new Error("Erro ao atualizar partidas jogadas hoje.");
  }

  type Tracked = { latestRowId: string; latestTimestamp: string; maxGames: number };
  const byPlayer = new Map<string, Tracked>();

  for (const row of rows ?? []) {
    const games = row.games_played_today ?? 0;
    const ts = row.check_in_timestamp ?? "";
    const current = byPlayer.get(row.player_id);

    if (!current) {
      byPlayer.set(row.player_id, { latestRowId: row.id, latestTimestamp: ts, maxGames: games });
      continue;
    }

    byPlayer.set(row.player_id, {
      latestRowId: ts > current.latestTimestamp ? row.id : current.latestRowId,
      latestTimestamp: ts > current.latestTimestamp ? ts : current.latestTimestamp,
      maxGames: Math.max(current.maxGames, games),
    });
  }

  const results = await Promise.all(
    Array.from(byPlayer.values()).map((entry) =>
      supabase
        .from("session_presences")
        .update({ games_played_today: entry.maxGames + 1 })
        .eq("id", entry.latestRowId),
    ),
  );

  if (results.some((r) => r.error)) {
    throw new Error("Erro ao atualizar partidas jogadas hoje.");
  }
}
