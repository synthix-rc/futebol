import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { formatMonthLabel, monthKey } from "@/utils/dashboardMetrics";
import { MensalidadeStatus } from "../MensalidadeStatus";
import { PlayerHeader } from "./PlayerHeader";
import { ScoutingForm } from "./ScoutingForm";

export default async function PlayerDetailPage({
  params,
}: PageProps<"/admin/jogadores/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: player } = await supabase
    .from("players")
    .select(
      "id, name, type, status, photo_url, phone, email, birth_day, birth_month, def_rating, mid_rating, atk_rating, speed_rating, stamina_rating",
    )
    .eq("id", id)
    .maybeSingle();

  if (!player) {
    notFound();
  }

  const currentMonth = monthKey(new Date().toISOString());

  const { data: participations } = await supabase
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
    >();

  let mensalidadePayment: { amount: number } | null = null;
  if (player.type === "mensalista") {
    const { data } = await supabase
      .from("payments")
      .select("amount")
      .eq("player_id", id)
      .eq("type", "mensalidade")
      .eq("reference_month", currentMonth)
      .eq("status", "pago")
      .maybeSingle();
    if (data) mensalidadePayment = { amount: Number(data.amount) };
  }

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
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Ficha do Jogador</h1>
        <Link href="/admin/jogadores" className="text-sm underline underline-offset-4">
          ← Voltar
        </Link>
      </div>

      <PlayerHeader
        player={{
          id: player.id,
          name: player.name,
          type: player.type,
          status: player.status,
          photoUrl: player.photo_url,
          phone: player.phone,
          email: player.email,
          birthDay: player.birth_day,
          birthMonth: player.birth_month,
        }}
      />

      <ScoutingForm
        playerId={player.id}
        initial={{
          defRating: player.def_rating ?? 3,
          midRating: player.mid_rating ?? 3,
          atkRating: player.atk_rating ?? 3,
          speedRating: player.speed_rating ?? 3,
          staminaRating: player.stamina_rating ?? 3,
        }}
      />

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

      {player.type === "mensalista" && (
        <section className="rounded-lg border border-foreground/10 p-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/50">
            💰 Financeiro
          </h2>
          <MensalidadeStatus
            playerId={player.id}
            referenceMonth={currentMonth}
            monthLabel={formatMonthLabel(currentMonth)}
            paid={mensalidadePayment !== null}
            amount={mensalidadePayment?.amount ?? null}
          />
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-foreground/40">
        {label}
      </span>
    </div>
  );
}
