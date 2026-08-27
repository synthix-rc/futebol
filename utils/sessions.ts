import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionStatus } from "@/types/supabase";

// See types/supabase.ts for why this isn't `SupabaseClient<Database>`.
type TypedClient = SupabaseClient;

const BRAZIL_TIME_ZONE = "America/Sao_Paulo";

export const RSVP_CAP = 22;

/** "Urna da Rodada" (session_votes) stays open for exactly 2 hours after
 * closeSession stamps `closed_at` — shared between the Server Action that
 * enforces it (app/actions/voting.ts) and the /perfil/[id] page that
 * decides whether to show the ballot or the results. Lives here rather
 * than in voting.ts because a "use server" file may only export async
 * functions — a plain constant export there would fail the build. */
export const VOTING_WINDOW_MS = 2 * 60 * 60 * 1000;

export type SessionSummary = {
  id: string;
  sessionDate: string;
  status: SessionStatus;
  createdAt: string | null;
};

function mapSession(row: {
  id: string;
  session_date: string;
  status: SessionStatus;
  created_at?: string | null;
}): SessionSummary {
  return {
    id: row.id,
    sessionDate: row.session_date,
    status: row.status,
    createdAt: row.created_at ?? null,
  };
}

export async function getSessionById(
  supabase: TypedClient,
  sessionId: string,
): Promise<SessionSummary | null> {
  const { data } = await supabase
    .from("sessions")
    .select("id, session_date, status, created_at")
    .eq("id", sessionId)
    .maybeSingle();

  return data ? mapSession(data) : null;
}

/** The one session currently on the field — what the Campo tab loads. */
export async function getInProgressSession(
  supabase: TypedClient,
): Promise<SessionSummary | null> {
  const { data } = await supabase
    .from("sessions")
    .select("id, session_date, status, created_at")
    .eq("status", "in_progress")
    .maybeSingle();

  return data ? mapSession(data) : null;
}

/** The session currently collecting RSVPs — what "Gerar Link" manages. */
export async function getOpenForRsvpSession(
  supabase: TypedClient,
): Promise<SessionSummary | null> {
  const { data } = await supabase
    .from("sessions")
    .select("id, session_date, status, created_at")
    .eq("status", "open_for_rsvp")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? mapSession(data) : null;
}

export async function getRecentSessions(
  supabase: TypedClient,
  limit = 5,
): Promise<SessionSummary[]> {
  const { data } = await supabase
    .from("sessions")
    .select("id, session_date, status, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map(mapSession);
}

/**
 * "Today" (YYYY-MM-DD) as it reads on a Brasília wall clock — deliberately
 * NOT `from.getUTCFullYear()/getUTCMonth()/getUTCDate()`. Brasília is
 * UTC-3, so for the first 3 hours of every UTC day (00:00–03:00 UTC =
 * 21:00–00:00 the previous day in Brasília), the UTC calendar date has
 * already rolled over to a day that hasn't started yet in Brazil. Reading
 * the UTC digits directly during that window would treat "today" as one
 * day ahead of what any admin in Brazil sees on their own clock — the same
 * class of bug fixed in IncompleteQuadroCard's `toLocaleTimeString` earlier
 * this project (see git history), just on the date side instead of time.
 */
function todayInBrazil(from: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BRAZIL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(from);

  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Today (YYYY-MM-DD) on a Brasília wall clock — see `todayInBrazil` for
 * why this isn't just `new Date().toISOString().slice(0, 10)`. Used by
 * `generateNextSession` to reject a picked date that's already in the
 * past. */
export function todayInBrazilISODate(from: Date = new Date()): string {
  const { year, month, day } = todayInBrazil(from);
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

/**
 * The upcoming Sunday's date (YYYY-MM-DD), anchored to Brasília's calendar
 * date (see `todayInBrazil`) rather than the server's own clock. If today
 * is already Sunday, rolls to the Sunday after.
 *
 * This is now purely a *suggested default* for the "Gerar Lista" date
 * picker (app/admin/gerar-link/GenerateSessionButton.tsx) — the admin
 * picks the actual date freely (see `createSessionOnDate`), including a
 * midweek date for an extra pelada, so nothing here is enforced anymore.
 */
export function nextSundayISODate(from: Date = new Date()): string {
  const { year, month, day } = todayInBrazil(from);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = date.getUTCDay();
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  date.setUTCDate(date.getUTCDate() + daysUntilSunday);
  return date.toISOString().slice(0, 10);
}

/**
 * Creates a session on `sessionDate` (YYYY-MM-DD), open for RSVP. Refuses
 * to create a duplicate while one is already `open_for_rsvp` or
 * `in_progress` — the lifecycle only ever has one "live" session at a time.
 *
 * `sessionDate` is whatever the admin picked in "Gerar Lista" — see
 * `generateNextSession` (app/actions/sessions.ts) for the format/range
 * validation, which happens before this is ever called. This function no
 * longer computes the date itself (it used to be "last session + 7 days,
 * or next Sunday if the table's empty"): the whole point of letting the
 * admin choose is to allow a midweek pelada that doesn't land exactly a
 * week after the last one. `session_date` is still a real Postgres UNIQUE
 * column, so picking a date that collides with an existing session (any
 * status) still surfaces as a clear error via the insert below, not a
 * silent failure — see generateNextSession's catch.
 */
export async function createSessionOnDate(
  supabase: TypedClient,
  sessionDate: string,
): Promise<string> {
  const { data: existing, error: existingError } = await supabase
    .from("sessions")
    .select("id")
    .in("status", ["open_for_rsvp", "in_progress"])
    .limit(1);

  if (existingError) {
    throw new Error("Erro ao verificar sessões existentes.");
  }
  if (existing && existing.length > 0) {
    throw new Error("Já existe uma sessão aberta ou em andamento.");
  }

  const { data, error } = await supabase
    .from("sessions")
    .insert({ session_date: sessionDate, status: "open_for_rsvp" })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("Erro ao criar a sessão.");
  }

  return data.id;
}

/**
 * Atomically moves a session from `from` to `to` — the update only takes
 * effect if the session is still in the expected `from` status, guarding
 * against double-transitions (e.g. two admin tabs open at once).
 *
 * `extraFields` merges into the same UPDATE — used by closeSession to stamp
 * `closed_at` in the same atomic write as the status flip, rather than a
 * separate follow-up update that could partially fail.
 */
export async function transitionSession(
  supabase: TypedClient,
  sessionId: string,
  from: SessionStatus,
  to: SessionStatus,
  extraFields: Record<string, unknown> = {},
): Promise<void> {
  const { data, error } = await supabase
    .from("sessions")
    .update({ status: to, ...extraFields })
    .eq("id", sessionId)
    .eq("status", from)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("Erro ao atualizar o status da sessão.");
  }
  if (!data) {
    throw new Error(`A sessão não está mais no status esperado ("${from}").`);
  }
}

/**
 * Gate for the public RSVP page — status-driven, not clock-driven:
 * - `false` once the session has moved past `open_for_rsvp` (`in_progress`
 *   or `closed`).
 * - `false` once `RSVP_CAP` players have confirmed.
 * - `false` once `sessionDate` is strictly before today in Brasília
 *   (`todayInBrazilISODate`) — guards against accidentally reopening RSVP
 *   on a stale `open_for_rsvp` session nobody ever advanced, without
 *   blocking a same-day one.
 * - `true` otherwise.
 *
 * There used to be a 4th gate here — a hard 23:59-the-night-before cutoff
 * (`rsvpCutoff`, removed) — but that made it structurally impossible to
 * ever open RSVP for a same-day pelada: the cutoff for TODAY's session had
 * already passed the moment the session was created. Since "Gerar Lista"
 * now lets the admin pick any date (see createSessionOnDate), including
 * today, the clock-based cutoff had to go; the session's own status
 * (closed by the admin, or dated in the past) is what actually decides
 * this now.
 */
export function isRsvpOpen(
  session: Pick<SessionSummary, "status" | "sessionDate">,
  confirmedCount: number,
): { open: boolean; reason?: string } {
  if (session.status !== "open_for_rsvp") {
    return { open: false, reason: "Esta lista não está mais recebendo confirmações." };
  }
  if (session.sessionDate < todayInBrazilISODate()) {
    return { open: false, reason: "Esta lista já passou da data da pelada." };
  }
  if (confirmedCount >= RSVP_CAP) {
    return {
      open: false,
      reason: `Lista lotada — ${RSVP_CAP} vagas confirmadas preenchidas.`,
    };
  }
  return { open: true };
}
