"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { requireUser } from "@/utils/auth";
import { logAction } from "@/utils/audit";
import type { SupabaseClient } from "@supabase/supabase-js";

type ActionResult = { success: boolean; message?: string };

export type AdminProfileInput = {
  nome: string;
  phone: string;
  email: string;
  /** Public Storage URL from utils/storage.ts's uploadAvatar. Pass the
   * existing value through untouched when the admin didn't pick a new
   * photo — `undefined` here would leave the column alone on an upsert
   * that also needs to set the other columns, which isn't what we want. */
  photoUrl: string | null;
};

/**
 * Upserts the logged-in admin's own profile — id always comes from the
 * session (`auth.getUser()` via requireUser), never from client input, so
 * one admin can never write another admin's row.
 */
export async function upsertAdminProfile(input: AdminProfileInput): Promise<ActionResult> {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  if (!user) {
    return { success: false, message: "Sessão expirada. Faça login novamente." };
  }

  const nome = input.nome.trim();
  const phone = input.phone.trim();

  const { error } = await supabase.from("admin_profiles").upsert({
    id: user.id,
    nome: nome || null,
    phone: phone || null,
    email: input.email.trim() || null,
    photo_url: input.photoUrl,
  });

  if (error) {
    return { success: false, message: "Erro ao salvar perfil." };
  }

  await logAction("update_admin_profile", "admin_profiles", user.id);

  // Best-effort — an admin's own profile save must still succeed even if
  // the players-table mirror below hits a snag.
  try {
    await syncAdminToPlayer(supabase, user.id, { nome, phone, photoUrl: input.photoUrl });
  } catch (err) {
    console.error("[adminProfile] falha ao sincronizar jogador espelhado:", err);
  }

  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin/auditoria");
  revalidatePath("/admin/jogadores");
  return { success: true };
}

/**
 * Keeps a `players` row mirroring this admin in sync — for admins who are
 * themselves players in the pelada, so their ficha (ratings, games,
 * Magic Link) never drifts out of sync with the profile they actually
 * edit. Anti-duplicate lookup order:
 *   a) an existing player already linked via `admin_id` (the normal case
 *      after the first sync);
 *   b) failing that, a not-yet-linked player with the same `phone`;
 *   c) failing that, a not-yet-linked player with the same `name` —
 *      catches admins who already existed in `players` before this
 *      feature shipped.
 * Matches in (b)/(c) are restricted to `admin_id IS NULL` so this can
 * never "steal" a player already linked to a *different* admin.
 *
 * `name`/`phone` are only written when non-empty — `players.name` is
 * NOT NULL, and blanking either field just because the admin left it
 * empty in their own profile would be destructive, not a sync.
 */
async function syncAdminToPlayer(
  supabase: SupabaseClient,
  adminId: string,
  input: { nome: string; phone: string; photoUrl: string | null },
): Promise<void> {
  const { data: linkedPlayer } = await supabase
    .from("players")
    .select("id")
    .eq("admin_id", adminId)
    .maybeSingle();

  let targetPlayerId: string | null = linkedPlayer?.id ?? null;

  if (!targetPlayerId && input.phone) {
    const { data: byPhone } = await supabase
      .from("players")
      .select("id")
      .eq("phone", input.phone)
      .is("admin_id", null)
      .limit(1);
    targetPlayerId = byPhone?.[0]?.id ?? null;
  }

  if (!targetPlayerId && input.nome) {
    const { data: byName } = await supabase
      .from("players")
      .select("id")
      .eq("name", input.nome)
      .is("admin_id", null)
      .limit(1);
    targetPlayerId = byName?.[0]?.id ?? null;
  }

  if (targetPlayerId) {
    const update: Record<string, unknown> = {
      status: "active",
      type: "mensalista",
      admin_id: adminId,
      photo_url: input.photoUrl,
    };
    if (input.nome) update.name = input.nome;
    if (input.phone) update.phone = input.phone;

    await supabase.from("players").update(update).eq("id", targetPlayerId);
    return;
  }

  // Nothing to link to — only create a brand-new player if there's an
  // actual name to give it (players.name is NOT NULL).
  if (!input.nome) return;

  await supabase.from("players").insert({
    name: input.nome,
    phone: input.phone || null,
    photo_url: input.photoUrl,
    status: "active",
    type: "mensalista",
    admin_id: adminId,
  });
}
