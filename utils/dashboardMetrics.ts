// Pure calculation helpers for the admin Dashboard (app/admin/page.tsx).
// Kept separate from the data-fetching so the math is easy to read and
// verify on its own — none of this touches Supabase.

/** Today's real prices — there's no "fee" concept anywhere in the schema
 * (payments.amount is entered per-payment), so these are the app's only
 * source of truth for "what we currently charge". */
export const CURRENT_MENSALIDADE_FEE = 50;
export const CURRENT_DIARIA_FEE = 20;

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function monthKey(dateISO: string): string {
  return dateISO.slice(0, 7); // 'YYYY-MM' from a date or timestamp string
}

/** 'YYYY-MM' -> "agosto de 2026" (pt-BR), computed in UTC so it doesn't
 * shift by a day depending on the server's local timezone. */
export function formatMonthLabel(referenceMonth: string): string {
  const [year, month] = referenceMonth.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function monthBounds(referenceMonth: string): { start: string; end: string } {
  const [year, month] = referenceMonth.split("-").map(Number);
  const start = `${referenceMonth}-01`;
  const end =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  return { start, end };
}

/**
 * The `count` calendar months strictly before `from`'s month, oldest last
 * excluded — e.g. from August, trailingMonths(3) => ['2026-07', '2026-06',
 * '2026-05']. Deliberately excludes the current (likely partial) month so
 * it doesn't drag a trailing average down.
 */
export function trailingMonths(count: number, from: Date = new Date()): string[] {
  const months: string[] = [];
  for (let i = 1; i <= count; i++) {
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - i, 1));
    months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

/** The system's own "Go-Live" reference month — no mensalista owes
 * anything for months before this, no matter when their `players` row
 * was actually created (e.g. a historical member backfilled with an
 * older `created_at`). */
export const GO_LIVE_MONTH = "2026-08";

/**
 * How many months of mensalidade a player owes for — "conta corrente",
 * not just the current month — counting the current month as already
 * due: entrou em Agosto, em Agosto já deve o mês 1.
 *
 * The billing start is `max(createdMonth, GO_LIVE_MONTH)`: a plain
 * string comparison is safe here because 'YYYY-MM' is zero-padded and
 * fixed-width, so lexicographic order matches chronological order —
 * no need to parse either side into a Date to compare them.
 */
export function monthsOwed(createdAtISO: string | null, asOf: Date = new Date()): number {
  const createdMonth = createdAtISO ? monthKey(createdAtISO) : GO_LIVE_MONTH;
  const billingStart = createdMonth > GO_LIVE_MONTH ? createdMonth : GO_LIVE_MONTH;
  const currentMonth = monthKey(asOf.toISOString());

  const [startYear, startMonthNum] = billingStart.split("-").map(Number);
  const [curYear, curMonthNum] = currentMonth.split("-").map(Number);

  const elapsed = curYear * 12 + curMonthNum - (startYear * 12 + startMonthNum) + 1;
  return Math.max(1, elapsed);
}

