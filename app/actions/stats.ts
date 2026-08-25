"use server";

import { createClient } from "@/utils/supabase/server";
import { requireUser } from "@/utils/auth";
import { CURRENT_MENSALIDADE_FEE, monthBounds, monthKey, monthsOwed } from "@/utils/dashboardMetrics";

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
 *
 * Like every other Server Action here, this re-checks `requireUser()` on
 * its own rather than trusting that only the (already admin-gated)
 * /admin/jogadores page ever calls it — an exported "use server" function
 * is a directly POST-able RPC endpoint regardless of which page imports
 * it, so the page's own auth gate doesn't cover it. An unauthenticated
 * call gets back the same shape with everything empty, rather than
 * throwing — this is awaited directly by a Server Component with no
 * error boundary of its own.
 */
export async function getPlayerRankings(): Promise<PlayerRankings> {
  const supabase = await createClient();
  const year = new Date().getUTCFullYear();

  if (!(await requireUser(supabase))) {
    return {
      year,
      topGames: [],
      topScorers: [],
      topAssists: [],
      topCraques: [],
      topInsuportaveis: [],
      topPerebas: [],
    };
  }

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

export type DebtorEntry = {
  playerId: string;
  name: string;
  photoUrl: string | null;
  /** Saldo devedor em R$ — sempre > 0 (ver getMonthlyDebtors). */
  owed: number;
};

export type MonthlyDebtors = {
  debtors: DebtorEntry[];
  totalDebt: number;
};

/**
 * "Devedores do Mês" — conta corrente, não só o mês vigente: cada
 * mensalista ativo deve `mensesDevidos × CURRENT_MENSALIDADE_FEE` desde
 * o Go-Live (ou desde que entrou, se depois disso — ver
 * utils/dashboardMetrics.ts's monthsOwed), e paga isso conforme faz
 * pagamentos. O saldo é cumulativo: um mês sem pagar continua pesando
 * nos meses seguintes até ser quitado, em vez de "resetar" a cada mês
 * como a versão anterior deste card fazia.
 *
 * "Total Pago" soma pagamentos 'pago' que são category='campo' OU
 * type='mensalidade' — cobre tanto a mensalidade em si quanto qualquer
 * diária com esse rótulo, mas nunca uma contribuição de churrasco
 * (category='churrasco'), que é uma dívida completamente separada.
 *
 * Só entram na lista jogadores com saldo devedor > 0 — quem está em dia
 * ou pagou a mais simplesmente não aparece.
 */
export async function getMonthlyDebtors(): Promise<MonthlyDebtors> {
  const supabase = await createClient();

  if (!(await requireUser(supabase))) {
    return { debtors: [], totalDebt: 0 };
  }

  const { data: mensalistaPlayers } = await supabase
    .from("players")
    .select("id, name, photo_url, created_at")
    .eq("status", "active")
    .eq("type", "mensalista");

  if (!mensalistaPlayers || mensalistaPlayers.length === 0) {
    return { debtors: [], totalDebt: 0 };
  }

  const playerIds = mensalistaPlayers.map((player) => player.id);

  const { data: campoPayments } = await supabase
    .from("payments")
    .select("player_id, amount")
    .in("player_id", playerIds)
    .eq("status", "pago")
    .or("category.eq.campo,type.eq.mensalidade");

  const paidByPlayer = new Map<string, number>();
  for (const payment of campoPayments ?? []) {
    paidByPlayer.set(
      payment.player_id,
      (paidByPlayer.get(payment.player_id) ?? 0) + Number(payment.amount),
    );
  }

  const now = new Date();
  const debtors: DebtorEntry[] = [];
  let totalDebt = 0;

  for (const player of mensalistaPlayers) {
    const expected = monthsOwed(player.created_at, now) * CURRENT_MENSALIDADE_FEE;
    const paid = paidByPlayer.get(player.id) ?? 0;
    const owed = expected - paid;

    if (owed > 0) {
      debtors.push({
        playerId: player.id,
        name: player.name,
        photoUrl: player.photo_url,
        owed,
      });
      totalDebt += owed;
    }
  }

  debtors.sort((a, b) => b.owed - a.owed);

  return { debtors, totalDebt };
}

export type MonthlyIncomeBreakdown = {
  totalGeral: number;
  totalCampo: number;
  totalChurrasco: number;
};

/**
 * "Resumo de Entradas do Mês" — every payment marked 'pago' whose
 * `created_at` falls within the current calendar month (same
 * `monthBounds` boundary pattern already used for "Despesas do Mês" on
 * the Dashboard), split into the two `category` buckets. Every payment is
 * either 'campo' or 'churrasco' — mensalidade payments are always
 * 'campo', so "Total Campo" already covers the "campo ou mensalidade"
 * framing without a separate check.
 *
 * Deliberately keyed off `created_at` (when the money actually came in),
 * not `reference_month` (which period a mensalidade is credited toward)
 * — those can differ when a due is paid late, and this card is about
 * cash received this month, not dues assigned to it.
 */
export async function getMonthlyIncomeBreakdown(): Promise<MonthlyIncomeBreakdown> {
  const supabase = await createClient();

  if (!(await requireUser(supabase))) {
    return { totalGeral: 0, totalCampo: 0, totalChurrasco: 0 };
  }

  const currentMonth = monthKey(new Date().toISOString());
  const { start, end } = monthBounds(currentMonth);

  const { data: payments } = await supabase
    .from("payments")
    .select("amount, category")
    .eq("status", "pago")
    .gte("created_at", start)
    .lt("created_at", end);

  let totalCampo = 0;
  let totalChurrasco = 0;
  for (const payment of payments ?? []) {
    const amount = Number(payment.amount);
    if (payment.category === "churrasco") {
      totalChurrasco += amount;
    } else {
      totalCampo += amount;
    }
  }

  return {
    totalGeral: totalCampo + totalChurrasco,
    totalCampo,
    totalChurrasco,
  };
}
