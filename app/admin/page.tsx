import type { ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getInProgressSession, getOpenForRsvpSession } from "@/utils/sessions";
import { average, CURRENT_MENSALIDADE_FEE, monthBounds, monthKey } from "@/utils/dashboardMetrics";
import type { PlayerType } from "@/types/supabase";
import { PlayerAvatar } from "@/app/admin/jogadores/PlayerAvatar";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type ActivePlayer = {
  id: string;
  name: string;
  type: PlayerType | null;
  birthDay: number | null;
  birthMonth: number | null;
  photoUrl: string | null;
};

/**
 * "Centro de Comando" — a snapshot of the current month, not a financial
 * modeling tool. Trend/forecast material (Previsão Mês Seguinte, Saúde do
 * Caixa) moved to /admin/financeiro, which is where that kind of thinking
 * actually belongs; this page stays about "what needs my attention today".
 */
export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const currentMonth = monthKey(new Date().toISOString());
  const { start: monthStart, end: monthEnd } = monthBounds(currentMonth);
  const currentMonthNumber = Number(currentMonth.split("-")[1]);

  const [
    inProgressSession,
    openForRsvpSession,
    { data: activePlayerRows },
    { data: allPaidPayments },
    { data: allExpenses },
    { data: mensalidadePaidThisMonth },
    { data: expensesThisMonthRows },
    { data: diaristaPresenceRows },
    { data: recentClosedSessions },
  ] = await Promise.all([
    getInProgressSession(supabase),
    getOpenForRsvpSession(supabase),
    supabase
      .from("players")
      .select("id, name, type, birth_day, birth_month, photo_url")
      .eq("status", "active"),
    supabase.from("payments").select("amount").eq("status", "pago"),
    supabase.from("expenses").select("amount"),
    supabase
      .from("payments")
      .select("player_id")
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
      .from("sessions")
      .select("id, session_date")
      .eq("status", "closed")
      .order("session_date", { ascending: false })
      .limit(2),
  ]);

  const activePlayers: ActivePlayer[] = (activePlayerRows ?? []).map((player) => ({
    id: player.id,
    name: player.name,
    type: player.type,
    birthDay: player.birth_day,
    birthMonth: player.birth_month,
    photoUrl: player.photo_url,
  }));

  const sum = (rows: { amount: number }[] | null) =>
    (rows ?? []).reduce((total, row) => total + Number(row.amount), 0);

  const caixaAtual = sum(allPaidPayments) - sum(allExpenses);
  const mensalistasAtivos = activePlayers.filter((player) => player.type === "mensalista");

  // Média mensal de diaristas: distinct diaristas checked in per month,
  // averaged across every month that has had at least one session.
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

  // Aniversariantes do mês.
  const birthdaysThisMonth = activePlayers
    .filter((player) => player.birthMonth === currentMonthNumber && player.birthDay)
    .sort((a, b) => (a.birthDay ?? 0) - (b.birthDay ?? 0));

  // Devedores do mês — mensalistas ativos sem pagamento 'pago' registrado
  // para o mês corrente. Valor devido assume a mensalidade atual (não há
  // "fee" armazenado em lugar nenhum do schema — ver dashboardMetrics.ts).
  const paidPlayerIds = new Set((mensalidadePaidThisMonth ?? []).map((p) => p.player_id));
  const devedores = mensalistasAtivos.filter((player) => !paidPlayerIds.has(player.id));
  const totalDivida = devedores.length * CURRENT_MENSALIDADE_FEE;

  // Despesas do mês.
  const despesasDoMes = sum(expensesThisMonthRows);
  const despesasCount = (expensesThisMonthRows ?? []).length;

  // Alerta de ausência (risco de churn) — mensalistas ativos sem check-in
  // nas últimas 2 sessões encerradas.
  const recentSessionIds = (recentClosedSessions ?? []).map((session) => session.id);
  const { data: recentPresences } =
    recentSessionIds.length > 0
      ? await supabase
          .from("session_presences")
          .select("player_id")
          .in("session_id", recentSessionIds)
          .eq("status", "checked_in_field")
      : { data: [] as { player_id: string | null }[] };

  const presentPlayerIds = new Set(
    (recentPresences ?? [])
      .map((presence) => presence.player_id)
      .filter((id): id is string => Boolean(id)),
  );
  const churnRisk =
    recentSessionIds.length > 0
      ? mensalistasAtivos.filter((player) => !presentPlayerIds.has(player.id))
      : [];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-foreground/60">
          Centro de comando — visão do mês corrente.
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
          label="Caixa Atual"
          value={currency.format(caixaAtual)}
          tone={caixaAtual < 0 ? "negative" : "positive"}
        />
        <MetricCard label="Mensalistas Ativos" value={String(mensalistasAtivos.length)} />
        <MetricCard label="Média Mensal de Diaristas" value={avgDiaristasPerMonth.toFixed(1)} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Panel title="🎂 Aniversariantes do Mês">
          {birthdaysThisMonth.length === 0 ? (
            <EmptyState text="Ninguém faz aniversário este mês." />
          ) : (
            <ul className="flex flex-col gap-2">
              {birthdaysThisMonth.map((player) => (
                <li key={player.id} className="flex items-center gap-3 text-sm">
                  <PlayerAvatar photoUrl={player.photoUrl} name={player.name} />
                  <span className="flex-1 truncate">{player.name}</span>
                  <span className="font-mono text-xs text-foreground/50">
                    dia {player.birthDay}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="💸 Devedores do Mês">
          {devedores.length === 0 ? (
            <EmptyState text="Todos os mensalistas em dia. 🎉" />
          ) : (
            <>
              <ul className="flex flex-col gap-2">
                {devedores.map((player) => (
                  <li key={player.id} className="flex items-center gap-3 text-sm">
                    <PlayerAvatar photoUrl={player.photoUrl} name={player.name} />
                    <span className="flex-1 truncate">{player.name}</span>
                    <span className="font-mono text-xs text-red-500">
                      {currency.format(CURRENT_MENSALIDADE_FEE)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-foreground/10 pt-3 text-xs text-foreground/50">
                Total em aberto:{" "}
                <span className="font-semibold text-red-500">
                  {currency.format(totalDivida)}
                </span>
              </p>
            </>
          )}
        </Panel>

        <Panel title="🧾 Despesas do Mês">
          <p className="text-2xl font-bold text-red-500">{currency.format(despesasDoMes)}</p>
          <p className="mt-1 text-xs text-foreground/50">
            {despesasCount} lançamento{despesasCount === 1 ? "" : "s"} este mês.
          </p>
        </Panel>

        <Panel title="⚠️ Alerta de Ausência (Risco de Churn)">
          {recentSessionIds.length === 0 ? (
            <EmptyState text="Ainda não há sessões encerradas para avaliar." />
          ) : churnRisk.length === 0 ? (
            <EmptyState text="Todos os mensalistas apareceram recentemente. 🎉" />
          ) : (
            <>
              <p className="mb-2 text-xs text-foreground/50">
                Sem check-in nas últimas {recentSessionIds.length} sessões encerradas:
              </p>
              <ul className="flex flex-col gap-2">
                {churnRisk.map((player) => (
                  <li key={player.id} className="flex items-center gap-3 text-sm">
                    <PlayerAvatar photoUrl={player.photoUrl} name={player.name} />
                    <span className="flex-1 truncate">{player.name}</span>
                    <Link
                      href={`/admin/jogadores/${player.id}`}
                      className="whitespace-nowrap text-xs underline underline-offset-4"
                    >
                      Ver ficha
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>
      </div>
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
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-foreground/10 p-5">
      <span className="text-[10px] uppercase tracking-wide text-foreground/40">{label}</span>
      <span
        className={`text-2xl font-bold ${
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

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-foreground/10 p-5">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/50">
        {title}
      </h2>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-foreground/40">{text}</p>;
}
