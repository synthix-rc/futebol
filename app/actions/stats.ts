"use server";

import { createClient } from "@/utils/supabase/server";

const TOP_N = 10;

export type RankingEntry = {
  playerId: string;
  name: string;
  photoUrl: string | null;
  value: number;
};

export type PlayerRankings = {
  year: number;
  topGames: RankingEntry[];
  topScorers: RankingEntry[];
  topAssists: RankingEntry[];
  topCraques: RankingEntry[];
  topInsuportaveis: RankingEntry[];
  topPerebas: RankingEntry[];
};

/**
 * "Hall da Fama" — Top 10 rankings for the current calendar year, backing
 * the "Estatísticas & Rankings" tab on /admin/jogadores. Read-only, so
 * this is really just a query helper; it lives here (rather than
 * utils/stats.ts) and keeps the "use server" pragma to match this
 * directory's convention — every export is an async function, which is
 * all that constraint actually requires.
 *
 * Games/goals/assists come from match_participations (finished matches
 * only, same "Jogos" definition used on every player ficha); vote counts
 * come from session_votes. Both are filtered to `created_at` within the
 * current calendar year, computed in UTC.
 */
export async function getPlayerRankings(): Promise<PlayerRankings> {
  const supabase = await createClient();

  const year = new Date().getUTCFullYear();
  const yearStart = `${year}-01-01T00:00:00.000Z`;
  const yearEnd = `${year + 1}-01-01T00:00:00.000Z`;

  const [{ data: participations }, { data: votes }, { data: players }] = await Promise.all([
    supabase
      .from("match_participations")
      .select("player_id, goals, assists, matches!inner(status, created_at)")
      .eq("matches.status", "finished")
      .gte("matches.created_at", yearStart)
      .lt("matches.created_at", yearEnd)
      .overrideTypes<
        Array<{
          player_id: string | null;
          goals: number | null;
          assists: number | null;
          matches: { status: string; created_at: string | null } | null;
        }>,
        { merge: false }
      >(),
    supabase
      .from("session_votes")
      .select("craque_id, insuportavel_id, pereba_id, created_at")
      .gte("created_at", yearStart)
      .lt("created_at", yearEnd),
    supabase.from("players").select("id, name, photo_url"),
  ]);

  const playersById = new Map(
    (players ?? []).map((player) => [player.id, { name: player.name, photoUrl: player.photo_url }]),
  );

  const gamesCount = new Map<string, number>();
  const goalsSum = new Map<string, number>();
  const assistsSum = new Map<string, number>();
  for (const row of participations ?? []) {
    if (!row.player_id) continue;
    gamesCount.set(row.player_id, (gamesCount.get(row.player_id) ?? 0) + 1);
    goalsSum.set(row.player_id, (goalsSum.get(row.player_id) ?? 0) + (row.goals ?? 0));
    assistsSum.set(row.player_id, (assistsSum.get(row.player_id) ?? 0) + (row.assists ?? 0));
  }

  const craqueCount = new Map<string, number>();
  const insuportavelCount = new Map<string, number>();
  const perebaCount = new Map<string, number>();
  for (const vote of votes ?? []) {
    if (vote.craque_id) {
      craqueCount.set(vote.craque_id, (craqueCount.get(vote.craque_id) ?? 0) + 1);
    }
    if (vote.insuportavel_id) {
      insuportavelCount.set(
        vote.insuportavel_id,
        (insuportavelCount.get(vote.insuportavel_id) ?? 0) + 1,
      );
    }
    if (vote.pereba_id) {
      perebaCount.set(vote.pereba_id, (perebaCount.get(vote.pereba_id) ?? 0) + 1);
    }
  }

  function toRanking(counts: Map<string, number>): RankingEntry[] {
    return Array.from(counts.entries())
      .map(([playerId, value]) => {
        const player = playersById.get(playerId);
        return {
          playerId,
          name: player?.name ?? "Jogador",
          photoUrl: player?.photoUrl ?? null,
          value,
        };
      })
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, TOP_N);
  }

  return {
    year,
    topGames: toRanking(gamesCount),
    topScorers: toRanking(goalsSum),
    topAssists: toRanking(assistsSum),
    topCraques: toRanking(craqueCount),
    topInsuportaveis: toRanking(insuportavelCount),
    topPerebas: toRanking(perebaCount),
  };
}
