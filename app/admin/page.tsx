import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getInProgressSession, getOpenForRsvpSession } from "@/utils/sessions";
import type { PlayerType } from "@/types/supabase";
import {
  average,
  CURRENT_DIARIA_FEE,
  CURRENT_MENSALIDADE_FEE,
  formatMonthLabel,
  monthBounds,
  monthKey,
  trailingMonths,
} from "@/utils/dashboardMetrics";
import { CashHealthCard } from "./CashHealthCard";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const currentMonth = monthKey(new Date().toISOString());
  const trailing3 = trailingMonths(3);
  const trailingRangeStart = `${trailing3[trailing3.length - 1]}-01`;
  const { start: currentMonthStart } = monthBounds(currentMonth);

  const [
    inProgressSession,
    openForRsvpSession,
    { count: mensalistaCount },
    { data: diaristaPresenceRows },
    { data: allPaidPayments },
    { data: allExpenses },
    { data: currentMonthPayments },
    { data: currentMonthExpenses },
    { data: trailingPayments },
    { data: trailingExpenses },
  ] = await Promise.all([
    getInProgressSession(supabase),
    getOpenForRsvpSession(supabase),
    supabase.from("players").select("id", { count: "exact", head: true }).eq("type", "mensalista"),
    supabase
      .from("session_presences")
      .select("player_id, status, players(type), sessions(session_date)")
      .eq("status", "checked_in_field")
      .overrideTypes<
        Array<{
          player_id: string;
          players: { type: PlayerType | null } | null;
          sessions: { session_date: string } | null;
        }>,
        { merge: false }
      >(),
    supabase.from("payments").select("amount").eq("status", "pago"),
    supabase.from("expenses").select("amount"),
    supabase
      .from("payments")
      .select("amount")
      .eq("status", "pago")
      .eq("reference_month", currentMonth),
    supabase
      .from("expenses")
      .select("amount")
      .gte("expense_date", currentMonthStart)
      .lt("expense_date", monthBounds(currentMonth).end),
    supabase
      .from("payments")
      .select("amount, reference_month")
      .eq("status", "pago")
      .in("reference_month", trailing3),
    supabase
      .from("expenses")
      .select("amount, expense_date")
      .gte("expense_date", trailingRangeStart)
      .lt("expense_date", currentMonthStart),
  ]);

  // Average distinct diaristas checked in per month, across every month
  // that has at least one session — "Média de Diaristas/Mês".
  const diaristasByMonth = new Map<string, Set<string>>();
  for (const row of diaristaPresenceRows ?? []) {
    if (row.players?.type !== "diarista" || !row.sessions?.session_date) continue;
    const month = monthKey(row.sessions.session_date);
    if (!diaristasByMonth.has(month)) diaristasByMonth.set(month, new Set());
    diaristasByMonth.get(month)!.add(row.player_id);
  }
  const avgDiaristasPerMonth = average(
    Array.from(diaristasByMonth.values()).map((set) => set.size),
  );

  const sum = (rows: { amount: number }[] | null) =>
    (rows ?? []).reduce((total, row) => total + Number(row.amount), 0);

  const caixaAtual = sum(allPaidPayments) - sum(allExpenses);
  const entradasMesCorrente = sum(currentMonthPayments);
  const saidasMesCorrente = sum(currentMonthExpenses);

  const revenueByTrailingMonth = new Map<string, number>(trailing3.map((m) => [m, 0]));
  for (const payment of trailingPayments ?? []) {
    if (revenueByTrailingMonth.has(payment.reference_month)) {
      revenueByTrailingMonth.set(
        payment.reference_month,
        (revenueByTrailingMonth.get(payment.reference_month) ?? 0) + Number(payment.amount),
      );
    }
  }

  const expensesByTrailingMonth = new Map<string, number>(trailing3.map((m) => [m, 0]));
  for (const expense of trailingExpenses ?? []) {
    const month = monthKey(expense.expense_date);
    if (expensesByTrailingMonth.has(month)) {
      expensesByTrailingMonth.set(
        month,
        (expensesByTrailingMonth.get(month) ?? 0) + Number(expense.amount),
      );
    }
  }

  const avgMonthlyExpenses = average(Array.from(expensesByTrailingMonth.values()));
  const avgMonthlyBalance = average(
    trailing3.map((m) => (revenueByTrailingMonth.get(m) ?? 0) - (expensesByTrailingMonth.get(m) ?? 0)),
  );

  const previsaoEntradas =
    (mensalistaCount ?? 0) * CURRENT_MENSALIDADE_FEE +
    avgDiaristasPerMonth * CURRENT_DIARIA_FEE;
  const previsaoSaidas = avgMonthlyExpenses;
  const previsaoSaldo = previsaoEntradas - previsaoSaidas;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-foreground/60">
          Visão financeira e operacional da pelada.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-foreground/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
          <StatusLine
            label="Sessão de hoje"
            value={inProgressSession ? "Em andamento" : "Nenhuma"}
            tone={inProgressSession ? "positive" : undefined}
          />
          <StatusLine
            label="Lista da semana"
            value={openForRsvpSession ? "Aberta" : "Nenhuma"}
            tone={openForRsvpSession ? "positive" : undefined}
          />
        </div>
        <div className="flex gap-3">
          <Link href="/admin/campo" className="text-sm underline underline-offset-4">
            Campo →
          </Link>
          <Link href="/admin/gerar-link" className="text-sm underline underline-offset-4">
            Gerar Link →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Mensalistas Ativos"
          value={String(mensalistaCount ?? 0)}
        />
        <MetricCard
          label="Média Diaristas/Mês"
          value={avgDiaristasPerMonth.toFixed(1)}
        />
        <MetricCard
          label="Caixa Atual"
          value={currency.format(caixaAtual)}
          tone={caixaAtual < 0 ? "negative" : "positive"}
        />
      </div>

      <section className="rounded-lg border border-foreground/10 p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-foreground/50">
          📅 Mês Corrente ({formatMonthLabel(currentMonth)})
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <MetricCard label="Entradas" value={currency.format(entradasMesCorrente)} tone="positive" compact />
          <MetricCard label="Saídas" value={currency.format(saidasMesCorrente)} tone="negative" compact />
          <MetricCard
            label="Saldo do Mês"
            value={currency.format(entradasMesCorrente - saidasMesCorrente)}
            tone={entradasMesCorrente - saidasMesCorrente < 0 ? "negative" : "positive"}
            compact
          />
        </div>
      </section>

      <section className="rounded-lg border border-foreground/10 p-6">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground/50">
          🔮 Previsão Mês Seguinte
        </h2>
        <p className="mb-4 text-xs text-foreground/50">
          Entradas = (mensalistas × {currency.format(CURRENT_MENSALIDADE_FEE)}) +
          (média diaristas/mês × {currency.format(CURRENT_DIARIA_FEE)}). Saídas =
          média de despesas dos últimos 3 meses.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <MetricCard label="Previsão Entradas" value={currency.format(previsaoEntradas)} tone="positive" compact />
          <MetricCard label="Previsão Saídas" value={currency.format(previsaoSaidas)} tone="negative" compact />
          <MetricCard
            label="Saldo Projetado"
            value={currency.format(previsaoSaldo)}
            tone={previsaoSaldo < 0 ? "negative" : "positive"}
            compact
          />
        </div>
        <p className="mt-4 text-xs text-foreground/40">
          Saldo médio dos últimos 3 meses: {currency.format(avgMonthlyBalance)}
        </p>
      </section>

      <CashHealthCard
        avgMonthlyExpenses={avgMonthlyExpenses}
        mensalistaCount={mensalistaCount ?? 0}
        avgDiaristasPerMonth={avgDiaristasPerMonth}
      />
    </div>
  );
}

function StatusLine({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive";
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-foreground/50">{label}:</span>
      <span
        className={`font-semibold ${tone === "positive" ? "text-emerald-600 dark:text-emerald-400" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
  compact,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-lg border border-foreground/10 ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <span className="text-[10px] uppercase tracking-wide text-foreground/40">
        {label}
      </span>
      <span
        className={`font-bold ${compact ? "text-lg" : "text-2xl"} ${
          tone === "negative"
            ? "text-red-500"
            : tone === "positive"
              ? "text-emerald-600 dark:text-emerald-400"
              : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
