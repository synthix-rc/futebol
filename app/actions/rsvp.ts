"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getSessionById, isRsvpOpen } from "@/utils/sessions";

type ActionResult = { success: boolean; message?: string };

/**
 * Confirms a player's presence for a specific session (from the public
 * /lista/[sessionId] link — no more implicit "the active session" lookup).
 * Mensalistas go straight to `confirmed`; diaristas land on the waitlist
 * (`pending_waitlist`) until an admin promotes/checks them in.
 *
 * `pin` gates who's allowed to check this name off the list — see the
 * migration adding `players.pin`. The very first RSVP for a player claims
 * `pin` for them (set-on-first-use); every RSVP after that must match it.
 * Verified through `verify_or_set_player_pin`, a SECURITY DEFINER RPC —
 * this Server Action runs unauthenticated (same `anon` role as any direct
 * REST call), which has no RLS UPDATE policy on `players` and, more to the
 * point, should never be trusted to compare a secret against itself in
 * application code when the DB can do it without the value ever leaving
 * Postgres.
 *
 * This only stamps `rsvp_timestamp` — how fast the player responded during
 * the week, used for the Friday diarista cutoff rule. `check_in_timestamp`
 * (the Sunday FIFO queue/rotation clock) stays null until the admin
 * physically checks the player in at the field; see checkInPlayer in
 * app/actions/match.ts.
 */
export async function confirmPresence(
  sessionId: string,
  playerId: string,
  pin: string,
): Promise<ActionResult> {
  if (!sessionId || !playerId) {
    return { success: false, message: "Requisição inválida." };
  }
  if (!/^\d{4}$/.test(pin)) {
    return { success: false, message: "O PIN deve ter exatamente 4 números." };
  }

  const supabase = await createClient();

  const session = await getSessionById(supabase, sessionId);
  if (!session) {
    return { success: false, message: "Sessão não encontrada." };
  }

  const { count: confirmedCount, error: countError } = await supabase
    .from("session_presences")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("status", "confirmed");

  if (countError) {
    return { success: false, message: "Erro ao verificar vagas disponíveis." };
  }

  const gate = isRsvpOpen(session, confirmedCount ?? 0);
  if (!gate.open) {
    return { success: false, message: gate.reason };
  }

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, type")
    .eq("id", playerId)
    .single();

  if (playerError || !player || !player.type) {
    return { success: false, message: "Jogador não encontrado." };
  }

  const { data: pinOk, error: pinError } = await supabase.rpc(
    "verify_or_set_player_pin",
    { p_player_id: playerId, p_pin: pin },
  );

  if (pinError || !pinOk) {
    return { success: false, message: pinError?.message || "PIN incorreto." };
  }

  const { data: existing, error: existingError } = await supabase
    .from("session_presences")
    .select("id")
    .eq("session_id", sessionId)
    .eq("player_id", playerId)
    .maybeSingle();

  if (existingError) {
    return { success: false, message: "Erro ao verificar presença existente." };
  }
  if (existing) {
    return { success: false, message: "Presença já registrada para esta semana." };
  }

  const status = player.type === "mensalista" ? "confirmed" : "pending_waitlist";

  const { error: insertError } = await supabase.from("session_presences").insert({
    session_id: sessionId,
    player_id: playerId,
    status,
    rsvp_timestamp: new Date().toISOString(),
  });

  if (insertError) {
    return { success: false, message: "Erro ao confirmar presença." };
  }

  revalidatePath(`/lista/${sessionId}`);
  return { success: true };
}
