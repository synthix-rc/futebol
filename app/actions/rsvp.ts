"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

type ActionResult = { success: boolean; message?: string };

/**
 * Confirms a player's presence for the active session.
 * Mensalistas go straight to `confirmed`; diaristas land on the waitlist
 * (`pending_waitlist`) until an admin promotes/checks them in.
 *
 * This only stamps `rsvp_timestamp` — how fast the player responded during
 * the week, used for the Friday diarista cutoff rule. `check_in_timestamp`
 * (the Sunday FIFO queue/rotation clock) stays null until the admin
 * physically checks the player in at the field; see `checkInPlayer`.
 */
export async function confirmPresence(playerId: string): Promise<ActionResult> {
  if (!playerId) {
    return { success: false, message: "Jogador inválido." };
  }

  const supabase = await createClient();

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();

  if (sessionError) {
    return { success: false, message: "Erro ao buscar a sessão ativa." };
  }
  if (!session) {
    return { success: false, message: "Não há sessão ativa no momento." };
  }

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, type")
    .eq("id", playerId)
    .single();

  if (playerError || !player) {
    return { success: false, message: "Jogador não encontrado." };
  }

  const { data: existing, error: existingError } = await supabase
    .from("session_presences")
    .select("id")
    .eq("session_id", session.id)
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
    session_id: session.id,
    player_id: playerId,
    status,
    rsvp_timestamp: new Date().toISOString(),
  });

  if (insertError) {
    return { success: false, message: "Erro ao confirmar presença." };
  }

  revalidatePath("/rsvp");
  return { success: true };
}
