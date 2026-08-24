"use server";

import { createClient } from "@/utils/supabase/server";
import { VOTING_WINDOW_MS } from "@/utils/sessions";

type ActionResult = { success: boolean; message?: string };

export type SubmitSessionVotesInput = {
  sessionId: string;
  voterPlayerId: string;
  craqueId?: string | null;
  insuportavelId?: string | null;
  perebaId?: string | null;
};

/**
 * "Urna da Rodada" — public, unauthenticated (reached from /perfil/[id],
 * a magic-link-style page, same as confirmPresence/registerPlayer). No
 * requireUser() here on purpose: nothing about this action should require
 * an admin session, and eligibility is entirely re-derived server-side
 * from `session_presences` below, never trusted from the client.
 */
export async function submitSessionVotes(
  input: SubmitSessionVotesInput,
): Promise<ActionResult> {
  if (!input.sessionId) {
    return { success: false, message: "Sessão inválida." };
  }
  if (!input.voterPlayerId) {
    return { success: false, message: "Jogador inválido." };
  }

  const supabase = await createClient();

  // a) session must be closed and still inside the 2h voting window.
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, status, closed_at")
    .eq("id", input.sessionId)
    .maybeSingle();

  if (sessionError || !session) {
    return { success: false, message: "Sessão não encontrada." };
  }
  if (session.status !== "closed" || !session.closed_at) {
    return { success: false, message: "A votação desta rodada ainda não foi aberta." };
  }
  if (Date.now() > new Date(session.closed_at).getTime() + VOTING_WINDOW_MS) {
    return { success: false, message: "A urna desta rodada já fechou." };
  }

  // b) + c) voter and every non-null pick must be someone who actually
  // played that session (session_presences, status checked_in_field).
  const { data: presences, error: presencesError } = await supabase
    .from("session_presences")
    .select("player_id")
    .eq("session_id", input.sessionId)
    .eq("status", "checked_in_field");

  if (presencesError) {
    return { success: false, message: "Erro ao verificar os participantes da sessão." };
  }

  const eligibleIds = new Set(
    (presences ?? [])
      .map((presence) => presence.player_id)
      .filter((id): id is string => Boolean(id)),
  );

  if (!eligibleIds.has(input.voterPlayerId)) {
    return { success: false, message: "Você não jogou nesta sessão." };
  }

  const picks: Array<[string, string | null | undefined]> = [
    ["Craque", input.craqueId],
    ["Insuportável", input.insuportavelId],
    ["Pereba", input.perebaId],
  ];
  for (const [label, playerId] of picks) {
    if (playerId && !eligibleIds.has(playerId)) {
      return {
        success: false,
        message: `O jogador escolhido como "${label}" não jogou nesta sessão.`,
      };
    }
  }

  // d) voto único — the UNIQUE(session_id, voter_player_id) constraint is
  // the real guarantee (catches a race between two simultaneous requests);
  // this pre-check just gives a friendlier message on the common path.
  const { data: existingVote } = await supabase
    .from("session_votes")
    .select("id")
    .eq("session_id", input.sessionId)
    .eq("voter_player_id", input.voterPlayerId)
    .maybeSingle();

  if (existingVote) {
    return { success: false, message: "Você já votou nesta rodada." };
  }

  const { error: insertError } = await supabase.from("session_votes").insert({
    session_id: input.sessionId,
    voter_player_id: input.voterPlayerId,
    craque_id: input.craqueId ?? null,
    insuportavel_id: input.insuportavelId ?? null,
    pereba_id: input.perebaId ?? null,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return { success: false, message: "Você já votou nesta rodada." };
    }
    return { success: false, message: "Erro ao registrar seu voto." };
  }

  return { success: true };
}
