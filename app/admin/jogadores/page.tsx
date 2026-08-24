import { createClient } from "@/utils/supabase/server";
import { PlayersTable } from "./PlayersTable";

export default async function JogadoresPage() {
  const supabase = await createClient();

  const [{ data: players }, { data: participations }] = await Promise.all([
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
  ]);

  const finishedGamesByPlayer = new Map<string, number>();
  for (const participation of participations ?? []) {
    if (participation.matches?.status !== "finished") continue;
    finishedGamesByPlayer.set(
      participation.player_id,
      (finishedGamesByPlayer.get(participation.player_id) ?? 0) + 1,
    );
  }

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
  }));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold">Jogadores</h1>
        <p className="text-sm text-foreground/60">
          Ficha técnica e histórico de cada jogador.
        </p>
      </div>
      <PlayersTable players={rows} />
    </div>
  );
}
