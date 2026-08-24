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

export type CashHealthSuggestion = {
  avgMonthlyExpenses: number;
  currentExpectedRevenue: number;
  isHealthy: boolean;
  hasEnoughData: boolean;
  /** How much bigger than today's expected revenue the projected expenses
   * are — 1 means break-even, 1.2 means a 20% shortfall. */
  adjustmentFactor: number;
  suggestedMensalidade: number;
  suggestedDiaria: number;
};

/**
 * "Saúde do Caixa": suggests new mensalidade/diária values, worked example
 * from the spec — if average expenses exceed what today's prices would
 * bring in, scale both fees up by the same factor (keeping their current
 * ratio) just enough to cover it, rounded up to the nearest R$5 for a
 * price that's actually usable. If expenses don't exceed expected revenue,
 * today's prices already keep the caixa in the black — no change suggested.
 */
export function computeCashHealth(input: {
  avgMonthlyExpenses: number;
  mensalistaCount: number;
  avgDiaristasPerMonth: number;
  currentMensalidade?: number;
  currentDiaria?: number;
}): CashHealthSuggestion {
  const currentMensalidade = input.currentMensalidade ?? CURRENT_MENSALIDADE_FEE;
  const currentDiaria = input.currentDiaria ?? CURRENT_DIARIA_FEE;
  const currentExpectedRevenue =
    input.mensalistaCount * currentMensalidade +
    input.avgDiaristasPerMonth * currentDiaria;

  if (currentExpectedRevenue <= 0) {
    return {
      avgMonthlyExpenses: input.avgMonthlyExpenses,
      currentExpectedRevenue: 0,
      isHealthy: input.avgMonthlyExpenses <= 0,
      hasEnoughData: false,
      adjustmentFactor: 1,
      suggestedMensalidade: currentMensalidade,
      suggestedDiaria: currentDiaria,
    };
  }

  const adjustmentFactor = Math.max(
    1,
    input.avgMonthlyExpenses / currentExpectedRevenue,
  );

  const roundUpToFive = (value: number) => Math.ceil(value / 5) * 5;

  return {
    avgMonthlyExpenses: input.avgMonthlyExpenses,
    currentExpectedRevenue,
    isHealthy: adjustmentFactor <= 1,
    hasEnoughData: true,
    adjustmentFactor,
    suggestedMensalidade: roundUpToFive(currentMensalidade * adjustmentFactor),
    suggestedDiaria: roundUpToFive(currentDiaria * adjustmentFactor),
  };
}
