"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import {
  createSessionOnDate,
  todayInBrazilISODate,
  transitionSession,
} from "@/utils/sessions";
import { requireUser } from "@/utils/auth";
import { logAction } from "@/utils/audit";

type ActionResult = { success: boolean; message?: string; sessionId?: string };

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** True calendar-date check, not just format — `new Date(...)` silently
 * rolls an out-of-range day/month over into the next one (e.g. "2026-02-30"
 * becomes March 2nd) instead of rejecting it, so this round-trips the
 * parsed date back to YYYY-MM-DD and compares it against the input. */
function isRealISODate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * "Gerar Lista": opens a session for RSVP on `date` (YYYY-MM-DD), picked
 * freely by the admin — no longer forced to "next Sunday" or "last session
 * + 7 days", so an extra midweek pelada is just a different date. Refuses
 * to create a duplicate while one is already open or in progress, and
 * refuses a date that isn't a real calendar date or is already in the past
 * — see createSessionOnDate for the rest (including the UNIQUE-column
 * collision case).
 */
export async function generateNextSession(date: string): Promise<ActionResult> {
  if (!date || !ISO_DATE_PATTERN.test(date) || !isRealISODate(date)) {
    return { success: false, message: "Data inválida." };
  }
  if (date < todayInBrazilISODate()) {
    return { success: false, message: "Escolha uma data de hoje em diante." };
  }

  const supabase = await createClient();

  if (!(await requireUser(supabase))) {
    return { success: false, message: "Sessão expirada. Faça login novamente." };
  }

  let sessionId: string;
  try {
    sessionId = await createSessionOnDate(supabase, date);
  } catch (err) {
    console.error("ERRO SUPABASE GERAR SESSÃO:", err);
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

  if (!(await requireUser(supabase))) {
    return { success: false, message: "Sessão expirada. Faça login novamente." };
  }

  try {
    await transitionSession(supabase, sessionId, "open_for_rsvp", "in_progress");
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Erro ao iniciar a sessão.",
    };
  }

  revalidatePath("/admin/gerar-link");
  revalidatePath("/admin/campo");
  return { success: true };
}

/** Wraps up the day: moves a session from in_progress to closed. */
export async function closeSession(sessionId: string): Promise<ActionResult> {
  if (!sessionId) {
    return { success: false, message: "Sessão inválida." };
  }

  const supabase = await createClient();

  if (!(await requireUser(supabase))) {
    return { success: false, message: "Sessão expirada. Faça login novamente." };
  }

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
    await transitionSession(supabase, sessionId, "in_progress", "closed", {
      closed_at: new Date().toISOString(),
    });
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Erro ao encerrar a sessão.",
    };
  }

  await logAction("close_session", "session", sessionId);

  revalidatePath("/admin/gerar-link");
  revalidatePath("/admin/campo");
  return { success: true };
}
