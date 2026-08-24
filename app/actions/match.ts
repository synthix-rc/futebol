"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import {
  createMatch,
  getGamesPlayedToday,
  getQueue,
  requeuePlayers,
  toRoster,
} from "@/utils/queue";
import { getSessionById } from "@/utils/sessions";
import { requireUser } from "@/utils/auth";
import { logAction } from "@/utils/audit";
import type { PlayerType, WinnerTeam } from "@/types/supabase";

type ActionResult = { success: boolean; message?: string };

/**
 * Admin check-in at the field: moves a player's presence row to
 * `checked_in_field` and stamps their arrival time, which is what drives
 * their position in the FIFO queue.
 */
export async function checkInPlayer(presenceId: string): Promise<ActionResult> {
  if (!presenceId) {
    return { success: false, message: "Presença inválida." };
  }

  const supabase = await createClient();

  if (!(await requireUser(supabase))) {
    return { success: false, message: "Sessão expirada. Faça login novamente." };
  }

  const { data, error } = await supabase
    .from("session_presences")
    .update({
      status: "checked_in_field",
      check_in_timestamp: new Date().toISOString(),
    })
    .eq("id", presenceId)
    .select("session_id")
    .maybeSingle();

  if (error) {
    return { success: false, message: "Erro ao fazer check-in do jogador." };
  }

  revalidatePath("/admin/campo");
  if (data?.session_id) {
    revalidatePath(`/lista/${data.session_id}`);
  }
  return { success: true };
}

const TEAM_SIZE = 6;

/**
 * Kicks off the session with a match assembled by the admin's "Modo Deus"
 * draft board (app/admin/campo/DraftBoard.tsx): 6 vs 6, manually rebalanced from
 * the FIFO queue rather than auto-sliced by arrival order.
 *
 * FIFO still governs *who* is eligible to play — every id is re-checked
 * against the live queue below — the admin only controls which side (A/B)
 * each of those already-eligible players lands on. Server Actions are
 * reachable via direct POST, so the client's team split is never trusted
 * on its own.
 *
 * `completingPlayerIds` marks tapa-buraco fill-ins (see
 * `getSuggestedFillers`) — anyone in it gets `is_completing: true` on their
 * `match_participations` row and is skipped by the games-played-today
 * increment, so filling a gap doesn't count as a "real" appearance for them.
 */
export async function startFirstMatch(
  sessionId: string,
  teamAPlayerIds: string[],
  teamBPlayerIds: string[],
  completingPlayerIds: string[] = [],
): Promise<ActionResult> {
  if (!sessionId) {
    return { success: false, message: "Sessão inválida." };
  }

  if (
    !Array.isArray(teamAPlayerIds) ||
    !Array.isArray(teamBPlayerIds) ||
    teamAPlayerIds.length !== TEAM_SIZE ||
    teamBPlayerIds.length !== TEAM_SIZE
  ) {
    return {
      success: false,
      message: `Cada time precisa de exatamente ${TEAM_SIZE} jogadores.`,
    };
  }

  const allIds = [...teamAPlayerIds, ...teamBPlayerIds];
  if (new Set(allIds).size !== allIds.length) {
    return { success: false, message: "Um jogador não pode estar nos dois times." };
  }

  const supabase = await createClient();

  if (!(await requireUser(supabase))) {
    return { success: false, message: "Sessão expirada. Faça login novamente." };
  }

  const session = await getSessionById(supabase, sessionId);
  if (!session || session.status !== "in_progress") {
    return { success: false, message: "Esta sessão não está em andamento." };
  }

  try {
    // Re-validate every id against the live queue — never trust the
    // client's team split as proof those players are actually checked in
    // and free to play.
    const queue = await getQueue(supabase, sessionId);
    const queueIds = new Set(queue.map((entry) => entry.playerId));
    const notQueued = allIds.filter((id) => !queueIds.has(id));

    if (notQueued.length > 0) {
      return {
        success: false,
        message: "A fila mudou. Atualize a página e tente novamente.",
      };
    }

    const completingSet = new Set(completingPlayerIds);
    const teamARoster = teamAPlayerIds.map((playerId) => ({
      playerId,
      isCompleting: completingSet.has(playerId),
    }));
    const teamBRoster = teamBPlayerIds.map((playerId) => ({
      playerId,
      isCompleting: completingSet.has(playerId),
    }));

    await createMatch(supabase, sessionId, teamARoster, teamBRoster);
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Erro ao iniciar a partida.",
    };
  }

  revalidatePath("/admin/campo");
  return { success: true };
}

export type MatchPlayerStat = {
  playerId: string;
  goals: number;
  assists: number;
};

/**
 * Finalizes the match in progress and rotates players through the queue:
 * - A/B win: the losing team goes to the back of the queue; the winning
 *   team stays on the field and is paired with the next 6 challengers.
 * - Draw: both teams go to the back of the queue, and a new match is
 *   assembled from the next 12 players in line.
 *
 * A follow-up match is only created when enough challengers are already
 * queued — otherwise the field just goes idle until the admin starts the
 * next match manually (there is always at least a winning team waiting).
 *
 * `playerStats` is the "Súmula" tally (goals/assists per participant)
 * collected by the admin before confirming the result — written to each
 * player's `match_participations` row before the queue rotates. Omitting it
 * (or passing an empty array) just finishes the match with no stats, so
 * older callers still work.
 */
export async function finishMatch(
  matchId: string,
  result: WinnerTeam,
  playerStats: MatchPlayerStat[] = [],
): Promise<ActionResult> {
  if (!matchId) {
    return { success: false, message: "Partida inválida." };
  }

  const supabase = await createClient();

  if (!(await requireUser(supabase))) {
    return { success: false, message: "Sessão expirada. Faça login novamente." };
  }

  try {
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id, session_id, status")
      .eq("id", matchId)
      .single();

    if (matchError || !match) {
      throw new Error("Partida não encontrada.");
    }
    if (match.status !== "in_progress") {
      throw new Error("Esta partida já foi finalizada.");
    }

    const { data: participations, error: participationsError } = await supabase
      .from("match_participations")
      .select("player_id, team")
      .eq("match_id", matchId);

    if (participationsError || !participations) {
      throw new Error("Erro ao carregar os jogadores da partida.");
    }

    const teamAIds = participations
      .filter((p) => p.team === "A")
      .map((p) => p.player_id);
    const teamBIds = participations
      .filter((p) => p.team === "B")
      .map((p) => p.player_id);

    const participantIds = new Set(participations.map((p) => p.player_id));
    for (const stat of playerStats) {
      if (!participantIds.has(stat.playerId)) continue;
      const goals = Math.max(0, Math.trunc(stat.goals) || 0);
      const assists = Math.max(0, Math.trunc(stat.assists) || 0);
      if (goals === 0 && assists === 0) continue;

      const { error: statError } = await supabase
        .from("match_participations")
        .update({ goals, assists })
        .eq("match_id", matchId)
        .eq("player_id", stat.playerId);

      if (statError) {
        throw new Error("Erro ao salvar a súmula da partida.");
      }
    }

    const { error: closeError } = await supabase
      .from("matches")
      .update({ status: "finished", winner_team: result })
      .eq("id", matchId);

    if (closeError) {
      throw new Error("Erro ao encerrar a partida.");
    }

    const now = new Date().toISOString();

    if (result === "draw") {
      await requeuePlayers(supabase, match.session_id, [...teamAIds, ...teamBIds], now);

      const queue = await getQueue(supabase, match.session_id);
      if (queue.length >= 12) {
        await createMatch(
          supabase,
          match.session_id,
          toRoster(queue.slice(0, 6).map((entry) => entry.playerId)),
          toRoster(queue.slice(6, 12).map((entry) => entry.playerId)),
        );
      }
    } else {
      const winningIds = result === "team_a" ? teamAIds : teamBIds;
      const losingIds = result === "team_a" ? teamBIds : teamAIds;

      await requeuePlayers(supabase, match.session_id, losingIds, now);

      const winningSet = new Set(winningIds);
      const queue = (await getQueue(supabase, match.session_id)).filter(
        (entry) => !winningSet.has(entry.playerId),
      );

      if (queue.length >= 6) {
        const challengers = queue.slice(0, 6).map((entry) => entry.playerId);
        await createMatch(
          supabase,
          match.session_id,
          toRoster(winningIds),
          toRoster(challengers),
        );
      }
    }
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error ? err.message : "Erro ao processar o resultado da partida.",
    };
  }

  await logAction("finish_match", "match", matchId, {
    result,
    playerStats: playerStats.filter((s) => s.goals > 0 || s.assists > 0),
  });

  revalidatePath("/admin/campo");
  return { success: true };
}

export type SuggestedFiller = {
  id: string;
  name: string;
  type: PlayerType;
  gamesPlayedToday: number;
  defRating: number | null;
  midRating: number | null;
  atkRating: number | null;
  speedRating: number | null;
  staminaRating: number | null;
};

type SuggestedFillersResult =
  | { success: true; players: SuggestedFiller[] }
  | { success: false; message: string };

/**
 * "Tapa-buraco": returns every available candidate to fill an incomplete
 * quadro, ranked in strict priority order:
 *   1. type — mensalista before diarista.
 *   2. games_played_today ascending — whoever has played the least today.
 *   3. exact ties on both of the above are broken randomly, so no single
 *      player is systematically favored when the rule can't distinguish them.
 *
 * Returns the *whole* ranked pool rather than slicing to the number of open
 * slots — the admin picks exactly who plays from this list client-side
 * (see SuggestedFillersPanel), since a top-ranked suggestion can turn out
 * to be unavailable (hurt, tired, has to leave) and they need other options
 * to swap in without re-fetching.
 *
 * The candidate pool is the live FIFO queue itself (checked_in_field, not
 * already tied to an in-progress match) minus `excludePlayerIds` — i.e. the
 * quadro's current members — so a suggestion is always someone genuinely
 * available right now. This is a read-only lookup: nothing is written to
 * the database here, and calling it repeatedly is safe.
 */
export async function getSuggestedFillers(
  sessionId: string,
  excludePlayerIds: string[],
): Promise<SuggestedFillersResult> {
  if (!sessionId) {
    return { success: false, message: "Sessão inválida." };
  }

  const supabase = await createClient();

  if (!(await requireUser(supabase))) {
    return { success: false, message: "Sessão expirada. Faça login novamente." };
  }

  const session = await getSessionById(supabase, sessionId);
  if (!session) {
    return { success: false, message: "Sessão não encontrada." };
  }

  try {
    const excludeSet = new Set(excludePlayerIds);
    const pool = (await getQueue(supabase, sessionId)).filter(
      (entry) => !excludeSet.has(entry.playerId),
    );

    if (pool.length === 0) {
      return { success: true, players: [] };
    }

    const gamesByPlayer = await getGamesPlayedToday(
      supabase,
      sessionId,
      pool.map((entry) => entry.playerId),
    );

    const candidates: SuggestedFiller[] = pool.map((entry) => ({
      id: entry.playerId,
      name: entry.player.name,
      type: entry.player.type,
      gamesPlayedToday: gamesByPlayer.get(entry.playerId) ?? 0,
      defRating: entry.player.defRating,
      midRating: entry.player.midRating,
      atkRating: entry.player.atkRating,
      speedRating: entry.player.speedRating,
      staminaRating: entry.player.staminaRating,
    }));

    return { success: true, players: rankFillers(candidates) };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Erro ao buscar sugestões.",
    };
  }
}

function typePriority(type: PlayerType): number {
  return type === "mensalista" ? 0 : 1;
}

/**
 * Sorts by (type priority, games played today), then shuffles *within* each
 * exact tie group with Fisher–Yates — a plain `Math.random() - 0.5`
 * comparator is not a fair shuffle and can behave inconsistently under
 * Array.prototype.sort, which is the wrong tool for a "regra estrita de
 * justiça".
 */
function rankFillers(candidates: SuggestedFiller[]): SuggestedFiller[] {
  const sorted = [...candidates].sort((a, b) => {
    const typeDiff = typePriority(a.type) - typePriority(b.type);
    if (typeDiff !== 0) return typeDiff;
    return a.gamesPlayedToday - b.gamesPlayedToday;
  });

  const groups: SuggestedFiller[][] = [];
  for (const candidate of sorted) {
    const lastGroup = groups[groups.length - 1];
    const groupHead = lastGroup?.[0];
    const sameTieGroup =
      groupHead !== undefined &&
      typePriority(groupHead.type) === typePriority(candidate.type) &&
      groupHead.gamesPlayedToday === candidate.gamesPlayedToday;

    if (sameTieGroup) {
      lastGroup.push(candidate);
    } else {
      groups.push([candidate]);
    }
  }

  return groups.flatMap(shuffle);
}

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
