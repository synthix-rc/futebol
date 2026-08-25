"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { requireUser } from "@/utils/auth";

type ActionResult = { success: boolean; message?: string };

const MIN_PASSWORD_LENGTH = 8;

export type SignInInput = {
  email: string;
  password: string;
  /** Where to send the admin after a successful login — usually the page
   * proxy.ts bounced them from. Must be an internal path (checked below)
   * to avoid an open-redirect via a crafted `?redirectTo=` value. */
  redirectTo?: string;
};

export async function signIn(input: SignInInput): Promise<ActionResult> {
  if (!input.email || !input.password) {
    return { success: false, message: "Informe e-mail e senha." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    return { success: false, message: "E-mail ou senha inválidos." };
  }

  // `startsWith("/")` alone isn't enough — "//evil.com" also starts with
  // "/" but browsers treat a leading "//" as protocol-relative, i.e. an
  // external redirect. Reject that case explicitly to close the open
  // redirect (a crafted ?redirectTo=//phishing-site.com would otherwise
  // bounce a just-logged-in admin off to an external host).
  const isSafeInternalPath = (path: string) =>
    path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\");

  const destination =
    input.redirectTo && isSafeInternalPath(input.redirectTo) ? input.redirectTo : "/admin";

  redirect(destination);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** /admin/configuracoes' "Trocar Senha" form. */
export async function changePassword(newPassword: string): Promise<ActionResult> {
  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      success: false,
      message: `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    };
  }

  const supabase = await createClient();

  if (!(await requireUser(supabase))) {
    return { success: false, message: "Sessão expirada. Faça login novamente." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { success: false, message: "Erro ao trocar a senha. Tente novamente." };
  }

  return { success: true };
}
