import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { PaymentStatus, PaymentType } from "@/types/supabase";
import { PlayerAvatar } from "@/app/admin/jogadores/PlayerAvatar";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr", "05": "Mai", "06": "Jun",
  "07": "Jul", "08": "Ago", "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
};

function formatReferenceMonth(referenceMonth: string): string {
  const [year, month] = referenceMonth.split("-");
  const label = MONTH_LABELS[month] ?? month;
  return `${label}/${year}`;
}

/**
 * Portal do Jogador — public, read-only (no admin auth: proxy.ts's matcher
 * is an inclusion list of ["/admin/:path*", "/login"], so anything outside
 * that, including this route, is public by construction). Meant to be
 * reached via a magic-link-style shared URL, not behind a login.
 *
 * Deliberately does NOT show the 5-skill scouting ratings or radar chart —
 * those are admin-governance-only (see ScoutingForm.tsx on the admin
 * detail page), not something a player should see or dispute here.
 */
export default async function PlayerProfilePage({
  params,
}: PageProps<"/perfil/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: player } = await supabase
    .from("players")
    .select("id, name, type, status, photo_url")
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();

  if (!player) {
    notFound();
  }

  const [{ data: participations }, { data: payments }] = await Promise.all([
    supabase
      .from("match_participations")
      .select("goals, assists, matches(status)")
      .eq("player_id", id)
      .overrideTypes<
        Array<{
          goals: number | null;
          assists: number | null;
          matches: { status: string | null } | null;
        }>,
        { merge: false }
      >(),
    supabase
      .from("payments")
      .select("id, amount, type, status, reference_month, created_at")
      .eq("player_id", id)
      .order("reference_month", { ascending: false })
      .overrideTypes<
        Array<{
          id: string;
          amount: number;
          type: PaymentType;
          status: PaymentStatus;
          reference_month: string;
          created_at: string;
        }>,
        { merge: false }
      >(),
  ]);

  let finishedGames = 0;
  let totalGoals = 0;
  let totalAssists = 0;
  for (const participation of participations ?? []) {
    if (participation.matches?.status !== "finished") continue;
    finishedGames += 1;
    totalGoals += participation.goals ?? 0;
    totalAssists += participation.assists ?? 0;
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col items-center gap-3 rounded-lg border border-foreground/10 p-6 text-center">
        <PlayerAvatar photoUrl={player.photo_url} name={player.name} size="lg" />
        <div>
          <h1 className="text-xl font-bold">{player.name}</h1>
          <p className="text-sm text-foreground/60">
            {player.type === "mensalista" ? "Mensalista" : "Diarista"}
          </p>
        </div>
      </div>

      <section className="rounded-lg border border-foreground/10 p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-foreground/50">
          📊 Estatísticas
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Jogos" value={finishedGames} />
          <Stat label="Gols" value={totalGoals} />
          <Stat label="Assistências" value={totalAssists} />
        </div>
      </section>

      <section className="rounded-lg border border-foreground/10 p-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/50">
          💰 Extrato Financeiro
        </h2>
        {payments && payments.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="flex items-center justify-between gap-3 rounded-md border border-foreground/10 px-3 py-2 text-sm"
              >
                <div className="flex flex-col">
                  <span className="font-medium">
                    {payment.type === "mensalidade" ? "Mensalidade" : "Diária"}
                  </span>
                  <span className="text-xs text-foreground/50">
                    {formatReferenceMonth(payment.reference_month)}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-mono">{currency.format(Number(payment.amount))}</span>
                  <PaymentStatusBadge status={payment.status} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-foreground/40">Nenhum lançamento por aqui ainda.</p>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-foreground/40">{label}</span>
    </div>
  );
}

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  if (status === "pago") {
    return (
      <span className="whitespace-nowrap rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
        ✅ Pago
      </span>
    );
  }
  return (
    <span className="whitespace-nowrap rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
      ⏳ Pendente
    </span>
  );
}
