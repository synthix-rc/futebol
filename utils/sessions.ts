import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionStatus } from "@/types/supabase";

// See types/supabase.ts for why this isn't `SupabaseClient<Database>`.
type TypedClient = SupabaseClient;

export const RSVP_CAP = 22;

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
 * The upcoming Sunday's date (YYYY-MM-DD), computed in UTC to avoid
 * depending on the server's local timezone. If today is already Sunday,
 * rolls to the Sunday after — "Gerar Lista" plans *next* week's pelada, not
 * a same-day re-booking.
 */
export function nextSundayISODate(from: Date = new Date()): string {
  const date = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
  );
  const day = date.getUTCDay();
  const daysUntilSunday = day === 0 ? 7 : 7 - day;
  date.setUTCDate(date.getUTCDate() + daysUntilSunday);
  return date.toISOString().slice(0, 10);
}

/**
 * Creates the next Sunday's session, open for RSVP. Refuses to create a
 * duplicate while one is already `open_for_rsvp` or `in_progress` — the
 * lifecycle only ever has one "live" session at a time.
 */
export async function createNextSundaySession(
  supabase: TypedClient,
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
    .insert({ session_date: nextSundayISODate(), status: "open_for_rsvp" })
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
 */
export async function transitionSession(
  supabase: TypedClient,
  sessionId: string,
  from: SessionStatus,
  to: SessionStatus,
): Promise<void> {
  const { data, error } = await supabase
    .from("sessions")
    .update({ status: to })
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

const BRAZIL_TIME_ZONE = "America/Sao_Paulo";

/**
 * The real UTC instant corresponding to the given wall-clock date/time as
 * it would read in `timeZone`. Resolves the zone's offset via Intl instead
 * of a hardcoded value, so it stays correct if the zone's DST rules ever
 * change (Brazil currently observes none, but has in the past).
 */
function zonedTimeToUtc(
  year: number,
  month: number, // 1-indexed
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date {
  const naiveUtcMs = Date.UTC(year, month - 1, day, hour, minute, second);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(naiveUtcMs));

  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  // Reading the naive guess's wall-clock digits back out *in the target
  // zone* and re-interpreting those digits as UTC reveals the zone's
  // offset at that moment (the gap between the two is exactly the offset).
  const asIfUtcMs = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );

  return new Date(naiveUtcMs - (asIfUtcMs - naiveUtcMs));
}

/**
 * Saturday 23:59:59 *Brasília time* before `sessionDate` (a Sunday) — the
 * cutoff is a real-world deadline for people in Brazil, not a UTC one.
 */
export function rsvpCutoff(sessionDate: string): Date {
  const [year, month, day] = sessionDate.split("-").map(Number);
  // `day 0` normalizes to the last day of the previous month/day before,
  // per standard Date.UTC rollover behavior.
  const saturday = new Date(Date.UTC(year, month - 1, day - 1));

  return zonedTimeToUtc(
    saturday.getUTCFullYear(),
    saturday.getUTCMonth() + 1,
    saturday.getUTCDate(),
    23,
    59,
    59,
    BRAZIL_TIME_ZONE,
  );
}

/**
 * Gate for the public RSVP page: closed once the session has moved past
 * `open_for_rsvp`, once `RSVP_CAP` players have confirmed, or once the
 * Saturday-23:59 cutoff has passed — whichever comes first.
 */
export function isRsvpOpen(
  session: Pick<SessionSummary, "status" | "sessionDate">,
  confirmedCount: number,
): { open: boolean; reason?: string } {
  if (session.status !== "open_for_rsvp") {
    return { open: false, reason: "Esta lista não está mais recebendo confirmações." };
  }
  if (confirmedCount >= RSVP_CAP) {
    return {
      open: false,
      reason: `Lista lotada — ${RSVP_CAP} vagas confirmadas preenchidas.`,
    };
  }
  if (Date.now() > rsvpCutoff(session.sessionDate).getTime()) {
    return {
      open: false,
      reason: "O prazo para confirmar presença encerrou no sábado às 23h59.",
    };
  }
  return { open: true };
}
