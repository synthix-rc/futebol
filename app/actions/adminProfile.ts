"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { requireUser } from "@/utils/auth";
import { logAction } from "@/utils/audit";

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

  const { error } = await supabase.from("admin_profiles").upsert({
    id: user.id,
    nome: input.nome.trim() || null,
    phone: input.phone.trim() || null,
    email: input.email.trim() || null,
    photo_url: input.photoUrl,
  });

  if (error) {
    return { success: false, message: "Erro ao salvar perfil." };
  }

  await logAction("update_admin_profile", "admin_profiles", user.id);

  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin/auditoria");
  return { success: true };
}
