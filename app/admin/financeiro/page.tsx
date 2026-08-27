import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getInProgressSession } from "@/utils/sessions";
import {
  average,
  CURRENT_DIARIA_FEE,
  CURRENT_MENSALIDADE_FEE,
  formatMonthLabel,
  monthBounds,
  monthKey,
  trailingMonths,
} from "@/utils/dashboardMetrics";
import type { PlayerType } from "@/types/supabase";
import { getMonthlyIncomeBreakdown } from "@/app/actions/stats";
import { ExpenseForm } from "./ExpenseForm";
import { GuestPaymentForm } from "./GuestPaymentForm";

type MensalistaRow = { id: string; name: string; paid: boolean; amount: number | null };

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function FinanceiroPage() {
  const supabase = await createClient();
  const session = await getInProgressSession(supabase);

  let cashTotal = 0;

  if (session) {
    const { data: paidPayments } = await supabase
      .from("payments")
      .select("amount")
      .eq("session_id", session.id)
      .eq("status", "pago");

    cashTotal = (paidPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  }

  const currentMonth = monthKey(new Date().toISOString());
  const { start: monthStart } = monthBounds(currentMonth);
  const trailing3 = trailingMonths(3);
  const trailingRangeStart = `${trailing3[trailing3.length - 1]}-01`;

  const [
    { data: allPlayers },
    { data: mensalistaPlayers },
    { data: mensalidadePayments },
    { data: diaristaPresenceRows },
    { data: trailingPayments },
    { data: trailingExpenses },
    incomeBreakdown,
  ] = await Promise.all([
    supabase.from("players").select("id, name").order("name"),
    supabase.from("players").select("id, name").eq("type", "mensalista").order("name"),
    supabase
      .from("payments")
      .select("player_id, amount")
      .eq("type", "mensalidade")
      .eq("reference_month", currentMonth)
      .eq("status", "pago"),
    supabase
      .from("session_presences")
      .select("player_id, players(type), sessions(session_date)")
      .eq("status", "checked_in_field")
      .overrideTypes<
        Array<{
          player_id: string;
          players: { type: PlayerType | null } | null;
          sessions: { session_date: string } | null;
        }>,
        { merge: false }
      >(),
    supabase
      .from("payments")
      .select("amount, reference_month")
      .eq("status", "pago")
      .in("reference_month", trailing3),
    supabase
      .from("expenses")
      .select("amount, expense_date")
      .gte("expense_date", trailingRangeStart)
      .lt("expense_date", monthStart),
    getMonthlyIncomeBreakdown(),
  ]);

  const paidMensalidadeByPlayer = new Map(
    (mensalidadePayments ?? []).map((p) => [p.player_id, Number(p.amount)]),
  );

  // Read-only overview — actually marking a mensalidade paid happens on
  // that player's own ficha (/admin/jogadores) now, not from a long list
  // here, since a monthly fee isn't tied to any one day's session.
  const mensalistaRows: MensalistaRow[] = (mensalistaPlayers ?? []).map((player) => ({
    id: player.id,
    name: player.name,
    paid: paidMensalidadeByPlayer.has(player.id),
    amount: paidMensalidadeByPlayer.get(player.id) ?? null,
  }));

  // Média mensal de diaristas — same "distinct diaristas checked in per
  // month" definition used on the Dashboard, needed here for both the
  // trailing-months forecast and the Saúde do Caixa suggestion.
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

  const mensalistaCount = mensalistaPlayers?.length ?? 0;
  const projecaoMensalistas = mensalistaCount * CURRENT_MENSALIDADE_FEE;
  const previsaoEntradas =
    mensalistaCount * CURRENT_MENSALIDADE_FEE + avgDiaristasPerMonth * CURRENT_DIARIA_FEE;
  const previsaoSaidas = avgMonthlyExpenses;
  const previsaoSaldo = previsaoEntradas - previsaoSaidas;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold">Financeiro</h1>
        <p className="text-sm text-foreground/60">
          Controle de caixa do dia, mensalidades e despesas.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <section className="rounded-lg border border-foreground/10 bg-card p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
            💰 Caixa do Dia
          </h2>
          {session ? (
            <p className="mt-2 text-3xl font-bold">{currency.format(cashTotal)}</p>
          ) : (
            <p className="mt-2 text-sm text-foreground/40">
              Nenhuma sessão em andamento no momento.
            </p>
          )}
        </section>

        <section className="rounded-lg border border-foreground/10 bg-card p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
            📊 Resumo de Entradas do Mês
          </h2>
          <p className="mt-2 text-3xl font-bold">
            {currency.format(incomeBreakdown.totalGeral)}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-0.5 rounded-md bg-blue-500/10 px-3 py-2">
              <span className="text-[10px] font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400">
                ⚽ Campo/Mensalidade
              </span>
              <span className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
                {currency.format(incomeBreakdown.totalCampo)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-md bg-orange-500/10 px-3 py-2">
              <span className="text-[10px] font-medium uppercase tracking-wide text-orange-600 dark:text-orange-400">
                🥩 Churrasco
              </span>
              <span className="font-mono text-sm font-semibold text-orange-600 dark:text-orange-400">
                {currency.format(incomeBreakdown.totalChurrasco)}
              </span>
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
            🧠 Inteligência & Previsão
          </h2>

          <section className="rounded-lg border border-foreground/10 bg-card p-4">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground/50">
              📈 Projeção de Receita (Mensalistas)
            </h3>
            <p className="mb-4 text-xs text-foreground/50">
              Automático, somente leitura — {mensalistaCount} mensalista
              {mensalistaCount === 1 ? "" : "s"} × mensalidade padrão (
              {currency.format(CURRENT_MENSALIDADE_FEE)}).
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <ForecastStat label="Mensalistas" value={String(mensalistaCount)} />
              <ForecastStat
                label="Projeção"
                value={currency.format(projecaoMensalistas)}
                tone="positive"
              />
              <ForecastStat
                label="Breakeven vs. despesa média"
                value={currency.format(projecaoMensalistas - avgMonthlyExpenses)}
                tone={projecaoMensalistas - avgMonthlyExpenses < 0 ? "negative" : "positive"}
              />
            </div>
          </section>

          <section className="rounded-lg border border-foreground/10 bg-card p-4">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground/50">
              🔮 Previsão Mês Seguinte
            </h3>
            <p className="mb-4 text-xs text-foreground/50">
              Entradas = (mensalistas × {currency.format(CURRENT_MENSALIDADE_FEE)}) + (média
              diaristas/mês × {currency.format(CURRENT_DIARIA_FEE)}). Saídas = média de
              despesas dos últimos 3 meses.
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <ForecastStat label="Entradas" value={currency.format(previsaoEntradas)} tone="positive" />
              <ForecastStat label="Saídas" value={currency.format(previsaoSaidas)} tone="negative" />
              <ForecastStat
                label="Saldo Projetado"
                value={currency.format(previsaoSaldo)}
                tone={previsaoSaldo < 0 ? "negative" : "positive"}
              />
            </div>
            <p className="mt-4 text-xs text-foreground/40">
              Saldo médio dos últimos 3 meses: {currency.format(avgMonthlyBalance)}
            </p>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
            📋 Movimentações
          </h2>

          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
              Registrar Receita Avulsa (Diarista)
            </h3>
            <GuestPaymentForm />
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
                Mensalidades — {formatMonthLabel(currentMonth)}
              </h3>
              <Link href="/admin/jogadores" className="text-xs underline underline-offset-4">
                Marcar pago na ficha do jogador →
              </Link>
            </div>
            <MensalidadeSummary rows={mensalistaRows} />
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
              Registrar Despesa
            </h3>
            <ExpenseForm sessionId={session?.id ?? null} players={allPlayers ?? []} />
          </section>
        </div>
      </div>
    </div>
  );
}

function ForecastStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-foreground/40">{label}</span>
      <span
        className={`text-sm font-semibold ${
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

function MensalidadeSummary({ rows }: { rows: MensalistaRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-foreground/40">Nenhum mensalista cadastrado.</p>;
  }

  const paidCount = rows.filter((row) => row.paid).length;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-foreground/50">
        {paidCount} de {rows.length} mensalistas pagaram este mês.
      </p>
      <ul className="flex flex-wrap gap-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              row.paid
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-foreground/10 text-foreground/50"
            }`}
          >
            {row.name} {row.paid ? "✓" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
