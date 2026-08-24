import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getQueue } from "@/utils/queue";
import type { MatchTeam, PlayerType, PresenceStatus } from "@/types/supabase";
import { CheckInButton } from "./CheckInButton";
import { DraftBoard } from "./DraftBoard";
import { FinishMatchButtons } from "./FinishMatchButtons";

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, session_date")
    .eq("is_active", true)
    .maybeSingle();

  if (!session) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <p className="text-4xl">⚠️</p>
        <h1 className="text-xl font-semibold">Nenhuma sessão ativa</h1>
        <p className="text-sm text-foreground/60">
          Abra uma sessão para começar a receber check-ins.
        </p>
        <Link href="/" className="text-sm underline underline-offset-4">
          Voltar para o início
        </Link>
      </div>
    );
  }

  const [{ data: pendingPresences }, queue, { data: activeMatch }] =
    await Promise.all([
      supabase
        .from("session_presences")
        .select("id, status, players(id, name, type)")
        .eq("session_id", session.id)
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
      getQueue(supabase, session.id),
      supabase
        .from("matches")
        .select(
          "id, team_a_name, team_b_name, match_participations(player_id, team, players(id, name))",
        )
        .eq("session_id", session.id)
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
    activeMatch?.match_participations.filter((p) => p.team === "A") ?? [];
  const teamB =
    activeMatch?.match_participations.filter((p) => p.team === "B") ?? [];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Painel do Admin</h1>
          <p className="text-sm text-foreground/60">
            Sessão de{" "}
            {new Date(session.session_date).toLocaleDateString("pt-BR", {
              timeZone: "UTC",
            })}
          </p>
        </div>
        <Link href="/" className="text-sm underline underline-offset-4">
          Início
        </Link>
      </div>

      <section className="rounded-lg border border-foreground/10 p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground/60">
          ⚔️ Partida em Andamento
        </h2>
        {activeMatch ? (
          <div className="flex flex-col gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <TeamPanel name={activeMatch.team_a_name} entries={teamA} />
              <TeamPanel name={activeMatch.team_b_name} entries={teamB} />
            </div>
            <FinishMatchButtons matchId={activeMatch.id} />
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-2">
            <p className="text-center text-sm text-foreground/50">
              Nenhuma partida em andamento. Monte os times abaixo.
            </p>
            <DraftBoard players={queue.slice(0, 12).map((entry) => entry.player)} />
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
          🚶 Fila de Prioridade (ordem de chegada)
        </h2>
        {queue.length === 0 ? (
          <p className="text-sm text-foreground/40">
            Ninguém disponível na fila no momento.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {queue.map((entry, index) => (
              <li
                key={entry.presenceId}
                className="flex items-center gap-3 rounded-md border border-foreground/10 px-3 py-2 text-sm"
              >
                <span className="text-xs font-mono text-foreground/40">
                  {index + 1}
                </span>
                {entry.player.name}
                <span className="ml-auto text-xs text-foreground/40">
                  {new Date(entry.checkInTimestamp).toLocaleTimeString(
                    "pt-BR",
                  )}
                </span>
              </li>
            ))}
          </ol>
        )}
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
        <ul className="divide-y divide-foreground/10 rounded-lg border border-foreground/10">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
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
