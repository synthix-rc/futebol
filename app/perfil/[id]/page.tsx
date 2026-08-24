import type { ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { VOTING_WINDOW_MS } from "@/utils/sessions";
import type { PaymentCategory, PaymentStatus, PaymentType } from "@/types/supabase";
import { PlayerAvatar } from "@/app/admin/jogadores/PlayerAvatar";
import { VotingCard, type VoteCandidate } from "./VotingCard";

// See types/supabase.ts for why this isn't `SupabaseClient<Database>`.
type TypedClient = SupabaseClient;

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
      .select("id, amount, type, category, status, reference_month, created_at")
      .eq("player_id", id)
      .order("reference_month", { ascending: false })
      .overrideTypes<
        Array<{
          id: string;
          amount: number;
          type: PaymentType;
          category: PaymentCategory;
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

  const votingSection = await buildVotingSection(supabase, id);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-10">
      {votingSection}

      <div className="flex flex-col items-center gap-3 rounded-lg border border-foreground/10 bg-card p-6 text-center">
        <PlayerAvatar photoUrl={player.photo_url} name={player.name} size="lg" />
        <div>
          <h1 className="text-xl font-bold">{player.name}</h1>
          <p className="text-sm text-foreground/60">
            {player.type === "mensalista" ? "Mensalista" : "Diarista"}
          </p>
        </div>
      </div>

      <section className="rounded-lg border border-foreground/10 bg-card p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-foreground/50">
          📊 Estatísticas
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Jogos" value={finishedGames} />
          <Stat label="Gols" value={totalGoals} />
          <Stat label="Assistências" value={totalAssists} />
        </div>
      </section>

      <section className="rounded-lg border border-foreground/10 bg-card p-6">
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
                    {" · "}
                    {payment.category === "churrasco" ? "Churrasco 🥩" : "Campo ⚽"}
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

/**
 * "Urna da Rodada" — decides what (if anything) to show at the top of the
 * profile: the ballot, the results, or nothing at all if this player has
 * never checked into a session that's since been closed.
 *
 * The 2h-window check here is UX only (what to render); submitSessionVotes
 * (app/actions/voting.ts) re-derives and enforces the same window itself,
 * never trusting this page's read.
 */
async function buildVotingSection(
  supabase: TypedClient,
  playerId: string,
): Promise<ReactNode> {
  const { data: lastPlayedRows } = await supabase
    .from("session_presences")
    .select("session_id, sessions!inner(id, status, closed_at)")
    .eq("player_id", playerId)
    .eq("status", "checked_in_field")
    .eq("sessions.status", "closed")
    // Legacy sessions closed before `closed_at` existed have it NULL —
    // exclude them explicitly rather than relying on the DB's default null
    // ordering (Postgres sorts NULLS FIRST on DESC, which would otherwise
    // make a nullable-closed_at legacy row outrank a real recent one).
    .not("sessions.closed_at", "is", null)
    .order("closed_at", { foreignTable: "sessions", ascending: false })
    .limit(1)
    .overrideTypes<
      Array<{
        session_id: string | null;
        sessions: { id: string; status: string; closed_at: string | null } | null;
      }>,
      { merge: false }
    >();

  const votingSession = lastPlayedRows?.[0]?.sessions ?? null;
  if (!votingSession?.closed_at) {
    return null;
  }

  const closesAt = new Date(votingSession.closed_at).getTime() + VOTING_WINDOW_MS;
  const windowOpen = Date.now() <= closesAt;

  const [{ data: participantRows }, { data: existingVote }] = await Promise.all([
    supabase
      .from("session_presences")
      .select("player_id, players(id, name, photo_url)")
      .eq("session_id", votingSession.id)
      .eq("status", "checked_in_field")
      .overrideTypes<
        Array<{
          player_id: string | null;
          players: { id: string; name: string; photo_url: string | null } | null;
        }>,
        { merge: false }
      >(),
    supabase
      .from("session_votes")
      .select("id")
      .eq("session_id", votingSession.id)
      .eq("voter_player_id", playerId)
      .maybeSingle(),
  ]);

  const candidates: VoteCandidate[] = (participantRows ?? [])
    .map((row) => row.players)
    .filter((candidate): candidate is { id: string; name: string; photo_url: string | null } =>
      candidate !== null,
    )
    .map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      photoUrl: candidate.photo_url,
    }));

  if (windowOpen && !existingVote) {
    return (
      <VotingCard
        sessionId={votingSession.id}
        voterPlayerId={playerId}
        candidates={candidates}
        closesAt={closesAt}
      />
    );
  }

  const { data: votes } = await supabase
    .from("session_votes")
    .select("craque_id, insuportavel_id, pereba_id")
    .eq("session_id", votingSession.id);

  return <VotingResults candidates={candidates} votes={votes ?? []} />;
}

type VoteRow = { craque_id: string | null; insuportavel_id: string | null; pereba_id: string | null };

const RESULT_CATEGORIES = [
  { field: "craque_id", label: "Craque do Dia", emoji: "🌟" },
  { field: "insuportavel_id", label: "Insuportável do Dia", emoji: "🤬" },
  { field: "pereba_id", label: "Pereba do Dia", emoji: "🩼" },
] as const satisfies ReadonlyArray<{ field: keyof VoteRow; label: string; emoji: string }>;

function tallyWinner(votes: VoteRow[], field: keyof VoteRow): string | null {
  const counts = new Map<string, number>();
  for (const vote of votes) {
    const candidateId = vote[field];
    if (!candidateId) continue;
    counts.set(candidateId, (counts.get(candidateId) ?? 0) + 1);
  }

  let winnerId: string | null = null;
  let max = 0;
  for (const [candidateId, count] of counts) {
    if (count > max) {
      max = count;
      winnerId = candidateId;
    }
  }
  return winnerId;
}

/** Read-only results card shown once a player has voted or the 2h window
 * has passed — a "friendly empty state" if nobody voted at all. */
function VotingResults({
  candidates,
  votes,
}: {
  candidates: VoteCandidate[];
  votes: VoteRow[];
}) {
  if (votes.length === 0) {
    return (
      <section className="rounded-lg border border-foreground/10 bg-card p-6 text-center text-sm text-foreground/50">
        🗳️ Votação encerrada — ninguém votou nesta rodada.
      </section>
    );
  }

  const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]));

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-foreground/10 bg-card p-6">
      <h2 className="text-center text-lg font-bold">🏆 Resultado da Urna</h2>
      <div className="grid grid-cols-3 gap-3">
        {RESULT_CATEGORIES.map(({ field, label, emoji }) => {
          const winnerId = tallyWinner(votes, field);
          const winner = winnerId ? candidatesById.get(winnerId) ?? null : null;
          return (
            <div key={field} className="flex flex-col items-center gap-1.5 text-center">
              <span className="text-xl">{emoji}</span>
              {winner ? (
                <>
                  <PlayerAvatar photoUrl={winner.photoUrl} name={winner.name} />
                  <span className="w-full truncate text-xs font-semibold">{winner.name}</span>
                </>
              ) : (
                <span className="text-xs text-foreground/40">—</span>
              )}
              <span className="text-[10px] uppercase tracking-wide text-foreground/40">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
