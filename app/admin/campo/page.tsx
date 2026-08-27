import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getNextMatchSuggestion, getQueue } from "@/utils/queue";
import { getInProgressSession } from "@/utils/sessions";
import type { MatchTeam, PlayerType, PresenceStatus } from "@/types/supabase";
import { CheckInButton } from "./CheckInButton";
import { DraftBoard } from "./DraftBoard";
import { FinishMatchButtons } from "./FinishMatchButtons";
import { QueueBoards } from "./QueueBoards";

export default async function CampoPage() {
  const supabase = await createClient();

  const session = await getInProgressSession(supabase);

  if (!session) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <p className="text-4xl">⚠️</p>
        <h1 className="text-xl font-semibold">Nenhuma sessão em andamento</h1>
        <p className="text-sm text-foreground/60">
          Inicie a sessão de domingo em &quot;Gerar Link&quot; para abrir o
          campo.
        </p>
        <Link
          href="/admin/gerar-link"
          className="text-sm underline underline-offset-4"
        >
          Ir para Gerar Link
        </Link>
      </div>
    );
  }

  const sessionId = session.id;

  const [{ data: pendingPresences }, queue, { data: activeMatch }] =
    await Promise.all([
      supabase
        .from("session_presences")
        .select("id, status, players(id, name, type)")
        .eq("session_id", sessionId)
        .in("status", ["confirmed", "pending_waitlist"])
        .order("check_in_timestamp", { ascending: true })
        .overrideTypes<
          Array<{
            id: string;
            status: PresenceStatus;
            players: { id: string; name: string; type: PlayerType } | null;
          }>,
          { merge: false }
        >(),
      getQueue(supabase, sessionId),
      supabase
        .from("matches")
        .select(
          "id, team_a_name, team_b_name, match_participations(player_id, team, players(id, name))",
        )
        .eq("session_id", sessionId)
        .eq("status", "in_progress")
        .maybeSingle()
        .overrideTypes<
          {
            id: string;
            team_a_name: string;
            team_b_name: string;
            match_participations: Array<{
              player_id: string;
              team: MatchTeam;
              players: { id: string; name: string } | null;
            }>;
          },
          { merge: false }
        >(),
    ]);

  const confirmedToCheckIn = (pendingPresences ?? []).filter(
    (p) => p.status === "confirmed",
  );
  const waitlistToCheckIn = (pendingPresences ?? []).filter(
    (p) => p.status === "pending_waitlist",
  );

  const teamA =
    activeMatch?.match_participations.filter((p) => p.team === "team_a") ?? [];
  const teamB =
    activeMatch?.match_participations.filter((p) => p.team === "team_b") ?? [];

  // "Quem ganha fica" (Regra 4/3) — only meaningful once the field is idle;
  // pre-fills DraftBoard's A/B split from the last result instead of a
  // naive top-12 slice. Falls back to that naive slice (via draftPool below)
  // when there's no finished match to suggest from yet.
  const suggestion = activeMatch
    ? null
    : await getNextMatchSuggestion(supabase, sessionId);
  const draftPool = suggestion
    ? [...suggestion.teamA, ...suggestion.teamB].map((entry) => entry.player)
    : queue.slice(0, 12).map((entry) => entry.player);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold">Campo</h1>
        <p className="text-sm text-foreground/60">
          Sessão de{" "}
          {new Date(`${session.sessionDate}T00:00:00.000Z`).toLocaleDateString(
            "pt-BR",
            { timeZone: "UTC" },
          )}
        </p>
      </div>

      <section className="rounded-lg border border-foreground/10 bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground/60">
          ⚔️ Partida em Andamento
        </h2>
        {activeMatch ? (
          <div className="flex flex-col gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <TeamPanel name={activeMatch.team_a_name} entries={teamA} />
              <TeamPanel name={activeMatch.team_b_name} entries={teamB} />
            </div>
            <FinishMatchButtons
              matchId={activeMatch.id}
              roster={activeMatch.match_participations.map((p) => ({
                playerId: p.player_id,
                name: p.players?.name ?? "Jogador",
                team: p.team,
              }))}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-2">
            <p className="text-center text-sm text-foreground/50">
              Nenhuma partida em andamento. Monte os times abaixo com quem
              está na fila, ou{" "}
              <Link
                href="/admin/gerar-link"
                className="underline underline-offset-4"
              >
                encerre a sessão
              </Link>{" "}
              se o dia acabou.
            </p>
            <DraftBoard
              sessionId={sessionId}
              players={draftPool}
              initialTeamAIds={suggestion?.teamA.map((entry) => entry.playerId)}
              initialTeamBIds={suggestion?.teamB.map((entry) => entry.playerId)}
            />
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
          🚶 Fila de Prioridade (por Quadro)
        </h2>
        <QueueBoards
          sessionId={sessionId}
          queue={queue}
          startingQuadroNumber={activeMatch ? 3 : 1}
        />
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <CheckInList title="✅ Confirmados" entries={confirmedToCheckIn} />
        <CheckInList title="⏳ Fila de Espera" entries={waitlistToCheckIn} />
      </section>
    </div>
  );
}

function TeamPanel({
  name,
  entries,
}: {
  name: string;
  entries: { player_id: string; players: { id: string; name: string } | null }[];
}) {
  return (
    <div className="rounded-md border border-foreground/10 p-4">
      <h3 className="mb-2 text-sm font-semibold">{name}</h3>
      <ul className="flex flex-col gap-1 text-sm text-foreground/70">
        {entries.map((entry) => (
          <li key={entry.player_id}>{entry.players?.name ?? "Jogador"}</li>
        ))}
      </ul>
    </div>
  );
}

function CheckInList({
  title,
  entries,
}: {
  title: string;
  entries: { id: string; players: { id: string; name: string } | null }[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
        {title} ({entries.length})
      </h2>
      {entries.length === 0 ? (
        <p className="text-sm text-foreground/40">Ninguém aguardando aqui.</p>
      ) : (
        <ul className="flex flex-col gap-2 sm:gap-0 sm:divide-y sm:divide-foreground/10 sm:rounded-lg sm:border sm:border-foreground/10 sm:bg-card">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-col gap-2 rounded-lg border border-foreground/10 bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:rounded-none sm:border-0 sm:p-3 sm:px-4"
            >
              <span className="text-sm font-medium">
                {entry.players?.name ?? "Jogador"}
              </span>
              <CheckInButton presenceId={entry.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
