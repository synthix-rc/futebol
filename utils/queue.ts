import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchTeam, PlayerType } from "@/types/supabase";

// See types/supabase.ts for why this isn't `SupabaseClient<Database>`.
type TypedClient = SupabaseClient;

export type QueueEntry = {
  presenceId: string;
  playerId: string;
  checkInTimestamp: string;
  player: {
    id: string;
    name: string;
    type: PlayerType;
  };
};

/**
 * Returns the id of the currently active session, or null if none is open.
 */
export async function getActiveSessionId(
  supabase: TypedClient,
): Promise<string | null> {
  const { data } = await supabase
    .from("sessions")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();

  return data?.id ?? null;
}

/**
 * The FIFO waiting queue: every player checked in at the field who is not
 * currently tied to an in-progress match, ordered by arrival time.
 *
 * Rotation (see `requeuePlayers`) appends a *new* `session_presences` row
 * each time a player is sent to the back of the line instead of mutating the
 * old one, so a player can have several `checked_in_field` rows in the same
 * session. Only the most recent one reflects their real place in line, so
 * rows are de-duplicated by player before sorting.
 */
export async function getQueue(
  supabase: TypedClient,
  sessionId: string,
): Promise<QueueEntry[]> {
  const { data: presences, error: presencesError } = await supabase
    .from("session_presences")
    .select(
      "id, player_id, check_in_timestamp, players(id, name, type)",
    )
    .eq("session_id", sessionId)
    .eq("status", "checked_in_field")
    .order("check_in_timestamp", { ascending: true })
    .overrideTypes<
      Array<{
        id: string;
        player_id: string;
        check_in_timestamp: string | null;
        players: { id: string; name: string; type: PlayerType } | null;
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
      throw new Error("Erro ao verificar jogadores em quadra.");
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
    .sort((a, b) =>
      (a.check_in_timestamp ?? "").localeCompare(b.check_in_timestamp ?? ""),
    )
    .map((presence) => ({
      presenceId: presence.id,
      playerId: presence.player_id,
      checkInTimestamp: presence.check_in_timestamp as string,
      player: {
        id: presence.players!.id,
        name: presence.players!.name,
        type: presence.players!.type,
      },
    }));
}

/**
 * Sends players to the back of the queue by inserting fresh
 * `session_presences` rows stamped with `timestamp`.
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

  const { error } = await supabase.from("session_presences").insert(rows);
  if (error) {
    throw new Error("Erro ao devolver jogadores para a fila.");
  }
}

/**
 * Creates a new in-progress match with two rosters of 6 players each.
 */
export async function createMatch(
  supabase: TypedClient,
  sessionId: string,
  teamAPlayerIds: string[],
  teamBPlayerIds: string[],
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
  }[] = [
    ...teamAPlayerIds.map((playerId) => ({
      match_id: match.id,
      player_id: playerId,
      team: "A" as const,
    })),
    ...teamBPlayerIds.map((playerId) => ({
      match_id: match.id,
      player_id: playerId,
      team: "B" as const,
    })),
  ];

  const { error: participationsError } = await supabase
    .from("match_participations")
    .insert(participations);

  if (participationsError) {
    throw new Error("Erro ao escalar os times da partida.");
  }

  return match.id;
}
