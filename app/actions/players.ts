"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { requireUser } from "@/utils/auth";
import { logAction } from "@/utils/audit";
import type { PlayerStatus, PlayerType } from "@/types/supabase";

type ActionResult = { success: boolean; message?: string };

const RATING_MIN = 1;
const RATING_MAX = 5;
const PLAYER_STATUSES: PlayerStatus[] = ["active", "pending", "inactive"];

function validateRatings(ratings: [string, number][]): string | null {
  for (const [label, value] of ratings) {
    if (!Number.isInteger(value) || value < RATING_MIN || value > RATING_MAX) {
      return `Nota de ${label} deve ser um número inteiro entre ${RATING_MIN} e ${RATING_MAX}.`;
    }
  }
  return null;
}

export type RegisterPlayerInput = {
  name: string;
  phone: string;
  type: PlayerType;
  email?: string | null;
  birthDay?: number | null;
  birthMonth?: number | null;
  photoUrl?: string | null;
};

/**
 * Public self-registration (`/cadastro` — no auth, deliberately, same as
 * confirmPresence in app/actions/rsvp.ts). New players land as
 * `status: 'pending'` with neutral (3/5) ratings across the board until an
 * admin reviews the profile and approves it (see approvePlayer).
 */
export async function registerPlayer(input: RegisterPlayerInput): Promise<ActionResult> {
  const name = input.name.trim();
  const phone = input.phone.trim();

  if (!name) {
    return { success: false, message: "Nome é obrigatório." };
  }
  if (!phone) {
    return { success: false, message: "WhatsApp é obrigatório." };
  }
  if (input.type !== "mensalista" && input.type !== "diarista") {
    return { success: false, message: "Selecione mensalista ou diarista." };
  }
  if (input.birthDay != null && (input.birthDay < 1 || input.birthDay > 31)) {
    return { success: false, message: "Dia de nascimento inválido." };
  }
  if (input.birthMonth != null && (input.birthMonth < 1 || input.birthMonth > 12)) {
    return { success: false, message: "Mês de nascimento inválido." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("players").insert({
    name,
    phone,
    type: input.type,
    email: input.email?.trim() || null,
    birth_day: input.birthDay ?? null,
    birth_month: input.birthMonth ?? null,
    photo_url: input.photoUrl ?? null,
    status: "pending",
    def_rating: 3,
    mid_rating: 3,
    atk_rating: 3,
    speed_rating: 3,
    stamina_rating: 3,
  });

  if (error) {
    return { success: false, message: "Erro ao enviar cadastro. Tente novamente." };
  }

  revalidatePath("/admin/jogadores");
  return { success: true };
}

export type PlayerProfileInput = {
  name: string;
  type: PlayerType;
  phone: string;
  email?: string | null;
  birthDay?: number | null;
  birthMonth?: number | null;
  photoUrl?: string | null;
};

/**
 * Admin edit of a player's contact/profile info (the ficha's header). Phone
 * is required for new signups (see registerPlayer) but NOT enforced here —
 * every pre-existing player has a null phone until an admin fills it in,
 * and blocking every other edit on that would just be friction.
 */
export async function updatePlayerProfile(
  playerId: string,
  input: PlayerProfileInput,
): Promise<ActionResult> {
  if (!playerId) {
    return { success: false, message: "Jogador inválido." };
  }
  if (!input.name.trim()) {
    return { success: false, message: "Nome é obrigatório." };
  }
  if (input.type !== "mensalista" && input.type !== "diarista") {
    return { success: false, message: "Tipo inválido." };
  }
  if (input.birthDay != null && (input.birthDay < 1 || input.birthDay > 31)) {
    return { success: false, message: "Dia de nascimento inválido." };
  }
  if (input.birthMonth != null && (input.birthMonth < 1 || input.birthMonth > 12)) {
    return { success: false, message: "Mês de nascimento inválido." };
  }

  const supabase = await createClient();

  if (!(await requireUser(supabase))) {
    return { success: false, message: "Sessão expirada. Faça login novamente." };
  }

  const { error } = await supabase
    .from("players")
    .update({
      name: input.name.trim(),
      type: input.type,
      phone: input.phone.trim() || null,
      email: input.email?.trim() || null,
      birth_day: input.birthDay ?? null,
      birth_month: input.birthMonth ?? null,
      ...(input.photoUrl !== undefined ? { photo_url: input.photoUrl } : {}),
    })
    .eq("id", playerId);

  if (error) {
    return { success: false, message: "Erro ao salvar perfil." };
  }

  revalidatePath("/admin/jogadores");
  revalidatePath(`/admin/jogadores/${playerId}`);
  return { success: true };
}

export type ScoutingInput = {
  defRating: number;
  midRating: number;
  atkRating: number;
  speedRating: number;
  staminaRating: number;
};

/** The 5-metric scouting card on the player's ficha. */
export async function updateScouting(
  playerId: string,
  input: ScoutingInput,
): Promise<ActionResult> {
  if (!playerId) {
    return { success: false, message: "Jogador inválido." };
  }

  const validationError = validateRatings([
    ["Defesa", input.defRating],
    ["Meio", input.midRating],
    ["Ataque", input.atkRating],
    ["Velocidade", input.speedRating],
    ["Resistência", input.staminaRating],
  ]);
  if (validationError) {
    return { success: false, message: validationError };
  }

  const supabase = await createClient();

  if (!(await requireUser(supabase))) {
    return { success: false, message: "Sessão expirada. Faça login novamente." };
  }

  const { error } = await supabase
    .from("players")
    .update({
      def_rating: input.defRating,
      mid_rating: input.midRating,
      atk_rating: input.atkRating,
      speed_rating: input.speedRating,
      stamina_rating: input.staminaRating,
    })
    .eq("id", playerId);

  if (error) {
    return { success: false, message: "Erro ao salvar scouting." };
  }

  revalidatePath(`/admin/jogadores/${playerId}`);
  return { success: true };
}

export type QuickEditInput = ScoutingInput & { type: PlayerType; status: PlayerStatus };

/** The Jogadores list's inline row edit — type, status, and the 5
 * scouting metrics, without touching name/phone/email/birthday (those
 * live on the ficha). `status` here overlaps with approvePlayer's
 * narrower pending->active transition (still exposed on the ficha's
 * "Aprovar Jogador" button) — both are valid ways to change it, this one
 * just also allows active<->inactive and reverting to pending. */
export async function updateQuickEdit(
  playerId: string,
  input: QuickEditInput,
): Promise<ActionResult> {
  if (!playerId) {
    return { success: false, message: "Jogador inválido." };
  }
  if (input.type !== "mensalista" && input.type !== "diarista") {
    return { success: false, message: "Tipo inválido." };
  }
  if (!PLAYER_STATUSES.includes(input.status)) {
    return { success: false, message: "Status inválido." };
  }

  const validationError = validateRatings([
    ["Defesa", input.defRating],
    ["Meio", input.midRating],
    ["Ataque", input.atkRating],
    ["Velocidade", input.speedRating],
    ["Resistência", input.staminaRating],
  ]);
  if (validationError) {
    return { success: false, message: validationError };
  }

  const supabase = await createClient();

  if (!(await requireUser(supabase))) {
    return { success: false, message: "Sessão expirada. Faça login novamente." };
  }

  const { error } = await supabase
    .from("players")
    .update({
      type: input.type,
      status: input.status,
      def_rating: input.defRating,
      mid_rating: input.midRating,
      atk_rating: input.atkRating,
      speed_rating: input.speedRating,
      stamina_rating: input.staminaRating,
    })
    .eq("id", playerId);

  if (error) {
    return { success: false, message: "Erro ao salvar." };
  }

  await logAction("update_player_quick_edit", "player", playerId, {
    type: input.type,
    status: input.status,
    defRating: input.defRating,
    midRating: input.midRating,
    atkRating: input.atkRating,
    speedRating: input.speedRating,
    staminaRating: input.staminaRating,
  });

  revalidatePath("/admin/jogadores");
  revalidatePath(`/admin/jogadores/${playerId}`);
  return { success: true };
}

/**
 * Clears a player's RSVP PIN (see the migration adding `players.pin`) for
 * when they forget it — their next RSVP will prompt them to set a new one,
 * same as if they'd never had one. Admin-only: this is the deliberate
 * "break glass" path around the PIN, so it goes through `requireUser` like
 * every other admin write, not the public `verify_or_set_player_pin` RPC
 * (which only ever moves a PIN from null to set, or confirms a match — it
 * has no path back to null by design, since anon has no reason to ever
 * clear someone else's PIN).
 */
export async function resetPlayerPin(playerId: string): Promise<ActionResult> {
  if (!playerId) {
    return { success: false, message: "Jogador inválido." };
  }

  const supabase = await createClient();

  if (!(await requireUser(supabase))) {
    return { success: false, message: "Sessão expirada. Faça login novamente." };
  }

  const { error } = await supabase
    .from("players")
    .update({ pin: null })
    .eq("id", playerId);

  if (error) {
    return { success: false, message: "Erro ao resetar o PIN." };
  }

  await logAction("reset_player_pin", "player", playerId);

  revalidatePath("/admin/jogadores");
  revalidatePath(`/admin/jogadores/${playerId}`);
  return { success: true };
}

/** Approves a pending signup — the only status transition exposed. There's
 * no reverse action (active -> pending) since nothing in the product asks
 * for one yet. */
export async function approvePlayer(playerId: string): Promise<ActionResult> {
  if (!playerId) {
    return { success: false, message: "Jogador inválido." };
  }

  const supabase = await createClient();

  if (!(await requireUser(supabase))) {
    return { success: false, message: "Sessão expirada. Faça login novamente." };
  }

  const { error } = await supabase
    .from("players")
    .update({ status: "active" })
    .eq("id", playerId)
    .eq("status", "pending");

  if (error) {
    return { success: false, message: "Erro ao aprovar jogador." };
  }

  revalidatePath("/admin/jogadores");
  revalidatePath(`/admin/jogadores/${playerId}`);
  return { success: true };
}
