"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createMatch, getQueue, requeuePlayers } from "@/utils/queue";
import type { WinnerTeam } from "@/types/supabase";

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

  const { error } = await supabase
    .from("session_presences")
    .update({
      status: "checked_in_field",
      check_in_timestamp: new Date().toISOString(),
    })
    .eq("id", presenceId);

  if (error) {
    return { success: false, message: "Erro ao fazer check-in do jogador." };
  }

  revalidatePath("/admin");
  revalidatePath("/rsvp");
  return { success: true };
}

const TEAM_SIZE = 6;

/**
 * Kicks off the session with a match assembled by the admin's "Modo Deus"
 * draft board (app/admin/DraftBoard.tsx): 6 vs 6, manually rebalanced from
 * the FIFO queue rather than auto-sliced by arrival order.
 *
 * FIFO still governs *who* is eligible to play — every id is re-checked
 * against the live queue below — the admin only controls which side (A/B)
 * each of those already-eligible players lands on. Server Actions are
 * reachable via direct POST, so the client's team split is never trusted
 * on its own.
 */
export async function startFirstMatch(
  teamAPlayerIds: string[],
  teamBPlayerIds: string[],
): Promise<ActionResult> {
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

  const { data: session } = await supabase
    .from("sessions")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();

  if (!session) {
    return { success: false, message: "Não há sessão ativa no momento." };
  }

  try {
    // Re-validate every id against the live queue — never trust the
    // client's team split as proof those players are actually checked in
    // and free to play.
    const queue = await getQueue(supabase, session.id);
    const queueIds = new Set(queue.map((entry) => entry.playerId));
    const notQueued = allIds.filter((id) => !queueIds.has(id));

    if (notQueued.length > 0) {
      return {
        success: false,
        message: "A fila mudou. Atualize a página e tente novamente.",
      };
    }

    await createMatch(supabase, session.id, teamAPlayerIds, teamBPlayerIds);
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Erro ao iniciar a partida.",
    };
  }

  revalidatePath("/admin");
  return { success: true };
}

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
 */
export async function finishMatch(
  matchId: string,
  result: WinnerTeam,
): Promise<ActionResult> {
  if (!matchId) {
    return { success: false, message: "Partida inválida." };
  }

  const supabase = await createClient();

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
          queue.slice(0, 6).map((entry) => entry.playerId),
          queue.slice(6, 12).map((entry) => entry.playerId),
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
        await createMatch(supabase, match.session_id, winningIds, challengers);
      }
    }
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error ? err.message : "Erro ao processar o resultado da partida.",
    };
  }

  revalidatePath("/admin");
  return { success: true };
}
