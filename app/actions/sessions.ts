"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createNextSundaySession, transitionSession } from "@/utils/sessions";

type ActionResult = { success: boolean; message?: string; sessionId?: string };

/**
 * "Gerar Lista": opens the next Sunday's session for RSVP. Refuses to
 * create a duplicate while one is already open or in progress — see
 * createNextSundaySession.
 */
export async function generateNextSession(): Promise<ActionResult> {
  const supabase = await createClient();

  let sessionId: string;
  try {
    sessionId = await createNextSundaySession(supabase);
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Erro ao gerar a lista.",
    };
  }

  revalidatePath("/admin/gerar-link");
  revalidatePath("/");
  return { success: true, sessionId };
}

/** Sunday arrives: moves a session from open_for_rsvp to in_progress. */
export async function startSundaySession(sessionId: string): Promise<ActionResult> {
  if (!sessionId) {
    return { success: false, message: "Sessão inválida." };
  }

  const supabase = await createClient();

  try {
    await transitionSession(supabase, sessionId, "open_for_rsvp", "in_progress");
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Erro ao iniciar a sessão.",
    };
  }

  revalidatePath("/admin/gerar-link");
  revalidatePath("/admin/quadra");
  return { success: true };
}

/** Wraps up the day: moves a session from in_progress to closed. */
export async function closeSession(sessionId: string): Promise<ActionResult> {
  if (!sessionId) {
    return { success: false, message: "Sessão inválida." };
  }

  const supabase = await createClient();

  const { data: activeMatch } = await supabase
    .from("matches")
    .select("id")
    .eq("session_id", sessionId)
    .eq("status", "in_progress")
    .maybeSingle();

  if (activeMatch) {
    return {
      success: false,
      message: "Encerre a partida em andamento antes de fechar a sessão.",
    };
  }

  try {
    await transitionSession(supabase, sessionId, "in_progress", "closed");
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Erro ao encerrar a sessão.",
    };
  }

  revalidatePath("/admin/gerar-link");
  revalidatePath("/admin/quadra");
  return { success: true };
}
