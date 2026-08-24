import { createClient } from "@/utils/supabase/server";
import { getInProgressSession } from "@/utils/sessions";
import type { PlayerType } from "@/types/supabase";
import { PaymentsList, type PaymentRowData } from "./PaymentsList";

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

  const currentMonth = new Date().toISOString().slice(0, 7);

  const [{ data: mensalistaPlayers }, { data: mensalidadePayments }] = await Promise.all([
    supabase.from("players").select("id, name").eq("type", "mensalista").order("name"),
    supabase
      .from("payments")
      .select("player_id, amount")
      .eq("type", "mensalidade")
      .eq("reference_month", currentMonth)
      .eq("status", "pago"),
  ]);

  const paidMensalidadeByPlayer = new Map(
    (mensalidadePayments ?? []).map((p) => [p.player_id, Number(p.amount)]),
  );

  const mensalistaRows: PaymentRowData[] = (mensalistaPlayers ?? []).map((player) => ({
    id: player.id,
    name: player.name,
    paid: paidMensalidadeByPlayer.has(player.id),
    amount: paidMensalidadeByPlayer.get(player.id) ?? null,
  }));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold">Financeiro</h1>
        <p className="text-sm text-foreground/60">
          Controle de caixa do dia e mensalidades.
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
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
          Visão Mensal (Mensalidades) — {formatMonthLabel(currentMonth)}
        </h2>
        <PaymentsList
          type="mensalidade"
          sessionId={null}
          referenceMonth={currentMonth}
          rows={mensalistaRows}
        />
      </section>
    </div>
  );
}

function formatMonthLabel(referenceMonth: string) {
  const [year, month] = referenceMonth.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
