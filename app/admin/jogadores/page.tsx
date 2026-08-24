import { createClient } from "@/utils/supabase/server";
import { getPlayerRankings } from "@/app/actions/stats";
import { monthKey } from "@/utils/dashboardMetrics";
import { PlayersTable } from "./PlayersTable";
import { PlayerRankings } from "./PlayerRankings";
import { JogadoresTabs } from "./JogadoresTabs";

export default async function JogadoresPage() {
  const supabase = await createClient();
  const currentMonth = monthKey(new Date().toISOString());

  const [{ data: players }, { data: participations }, { data: churrascoPayments }, rankings] =
    await Promise.all([
      supabase
        .from("players")
        .select(
          "id, name, type, status, photo_url, def_rating, mid_rating, atk_rating, speed_rating, stamina_rating",
        )
        .order("name"),
      supabase
        .from("match_participations")
        .select("player_id, matches(status)")
        .overrideTypes<
          Array<{ player_id: string; matches: { status: string | null } | null }>,
          { merge: false }
        >(),
      // BBQ Module — who's already chipped in for this month's churrasco,
      // for the 🥩 badge next to their name in the Elenco tab.
      supabase
        .from("payments")
        .select("player_id")
        .eq("category", "churrasco")
        .eq("reference_month", currentMonth)
        .eq("status", "pago"),
      getPlayerRankings(),
    ]);

  const finishedGamesByPlayer = new Map<string, number>();
  for (const participation of participations ?? []) {
    if (participation.matches?.status !== "finished") continue;
    finishedGamesByPlayer.set(
      participation.player_id,
      (finishedGamesByPlayer.get(participation.player_id) ?? 0) + 1,
    );
  }

  const churrascoPaidPlayerIds = new Set(
    (churrascoPayments ?? []).map((payment) => payment.player_id),
  );

  const rows = (players ?? []).map((player) => ({
    id: player.id,
    name: player.name,
    type: player.type,
    status: player.status,
    photoUrl: player.photo_url,
    defRating: player.def_rating,
    midRating: player.mid_rating,
    atkRating: player.atk_rating,
    speedRating: player.speed_rating,
    staminaRating: player.stamina_rating,
    finishedGames: finishedGamesByPlayer.get(player.id) ?? 0,
    paidChurrascoThisMonth: churrascoPaidPlayerIds.has(player.id),
  }));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold">Jogadores</h1>
        <p className="text-sm text-foreground/60">
          Ficha técnica, histórico e o Hall da Fama de cada jogador.
        </p>
      </div>
      <JogadoresTabs
        elenco={<PlayersTable players={rows} />}
        stats={<PlayerRankings rankings={rankings} />}
      />
    </div>
  );
}
