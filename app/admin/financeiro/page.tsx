import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getInProgressSession } from "@/utils/sessions";
import { formatMonthLabel, monthBounds, monthKey } from "@/utils/dashboardMetrics";
import type { PlayerType } from "@/types/supabase";
import { PaymentsList, type PaymentRowData } from "./PaymentsList";
import { CashForecast } from "./CashForecast";
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

  const [
    { data: allPlayers },
    { data: mensalistaPlayers },
    { data: mensalidadePayments },
    { data: expensesThisMonthRows },
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

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
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

      <CashForecast
        mensalistaCount={mensalistaPlayers?.length ?? 0}
        realizedRevenue={realizedRevenue}
        expensesThisMonth={expensesThisMonth}
        suggestedFee={suggestedFee}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
          Visão do Dia (Diárias)
        </h2>
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
            Mensalidades — {formatMonthLabel(currentMonth)}
          </h2>
          <Link
            href="/admin/jogadores"
            className="text-xs underline underline-offset-4"
          >
            Marcar pago na ficha do jogador →
          </Link>
        </div>
        <MensalidadeSummary rows={mensalistaRows} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
          Registrar Despesa
        </h2>
        <ExpenseForm sessionId={session?.id ?? null} players={allPlayers ?? []} />
      </section>
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
