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
import { PaymentsList, type PaymentRowData } from "./PaymentsList";
import { CashForecast } from "./CashForecast";
import { CashHealthCard } from "./CashHealthCard";
import { ExpenseForm } from "./ExpenseForm";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function FinanceiroPage() {
  const supabase = await createClient();
  const session = await getInProgressSession(supabase);

  let cashTotal = 0;
  let diaristaRows: PaymentRowData[] = [];

  if (session) {
    const [{ data: paidPayments }, { data: diaristaPresences }] = await Promise.all([
      supabase
        .from("payments")
        .select("amount")
        .eq("session_id", session.id)
        .eq("status", "pago"),
      supabase
        .from("session_presences")
        .select("player_id, players(id, name, type)")
        .eq("session_id", session.id)
        .eq("status", "checked_in_field")
        .overrideTypes<
          Array<{
            player_id: string;
            players: { id: string; name: string; type: PlayerType | null } | null;
          }>,
          { merge: false }
        >(),
    ]);

    cashTotal = (paidPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);

    const diaristaByPlayer = new Map<string, { id: string; name: string }>();
    for (const presence of diaristaPresences ?? []) {
      if (presence.players?.type === "diarista") {
        diaristaByPlayer.set(presence.player_id, {
          id: presence.players.id,
          name: presence.players.name,
        });
      }
    }

    const { data: diariaPayments } = await supabase
      .from("payments")
      .select("player_id, amount")
      .eq("session_id", session.id)
      .eq("type", "diaria")
      .eq("status", "pago");

    const paidByPlayer = new Map(
      (diariaPayments ?? []).map((p) => [p.player_id, Number(p.amount)]),
    );

    diaristaRows = Array.from(diaristaByPlayer.values())
      .map((player) => ({
        id: player.id,
        name: player.name,
        paid: paidByPlayer.has(player.id),
        amount: paidByPlayer.get(player.id) ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  const currentMonth = monthKey(new Date().toISOString());
  const { start: monthStart, end: monthEnd } = monthBounds(currentMonth);
  const trailing3 = trailingMonths(3);
  const trailingRangeStart = `${trailing3[trailing3.length - 1]}-01`;

  const [
    { data: allPlayers },
    { data: mensalistaPlayers },
    { data: mensalidadePayments },
    { data: expensesThisMonthRows },
    { data: diaristaPresenceRows },
    { data: trailingPayments },
    { data: trailingExpenses },
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
      .from("expenses")
      .select("amount")
      .gte("expense_date", monthStart)
      .lt("expense_date", monthEnd),
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
  ]);

  const paidMensalidadeByPlayer = new Map(
    (mensalidadePayments ?? []).map((p) => [p.player_id, Number(p.amount)]),
  );

  // Read-only overview — actually marking a mensalidade paid happens on
  // that player's own ficha (/admin/jogadores) now, not from a long list
  // here, since a monthly fee isn't tied to any one day's session.
  const mensalistaRows: PaymentRowData[] = (mensalistaPlayers ?? []).map((player) => ({
    id: player.id,
    name: player.name,
    paid: paidMensalidadeByPlayer.has(player.id),
    amount: paidMensalidadeByPlayer.get(player.id) ?? null,
  }));

  const expensesThisMonth = (expensesThisMonthRows ?? []).reduce(
    (sum, e) => sum + Number(e.amount),
    0,
  );
  const realizedRevenue = Array.from(paidMensalidadeByPlayer.values()).reduce(
    (sum, amount) => sum + amount,
    0,
  );

  let suggestedFee =
    paidMensalidadeByPlayer.size > 0
      ? realizedRevenue / paidMensalidadeByPlayer.size
      : 0;

  if (suggestedFee === 0) {
    const { data: anyMensalidade } = await supabase
      .from("payments")
      .select("amount")
      .eq("type", "mensalidade")
      .eq("status", "pago")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    suggestedFee = anyMensalidade ? Number(anyMensalidade.amount) : 0;
  }

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

      <section className="rounded-lg border border-foreground/10 p-6">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
            🧠 Inteligência & Previsão
          </h2>

          <CashForecast
            mensalistaCount={mensalistaCount}
            realizedRevenue={realizedRevenue}
            expensesThisMonth={expensesThisMonth}
            suggestedFee={suggestedFee}
          />

          <section className="rounded-lg border border-foreground/10 p-4">
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

          <CashHealthCard
            avgMonthlyExpenses={avgMonthlyExpenses}
            mensalistaCount={mensalistaCount}
            avgDiaristasPerMonth={avgDiaristasPerMonth}
          />
        </div>

        <div className="flex flex-col gap-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
            📋 Movimentações
          </h2>

          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
              Visão do Dia (Diárias)
            </h3>
            {session ? (
              <PaymentsList
                type="diaria"
                sessionId={session.id}
                referenceMonth={session.sessionDate.slice(0, 7)}
                rows={diaristaRows}
              />
            ) : (
              <p className="text-sm text-foreground/40">
                Inicie a sessão de domingo em &quot;Gerar Link&quot; para ver as diárias.
              </p>
            )}
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

function MensalidadeSummary({ rows }: { rows: PaymentRowData[] }) {
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
