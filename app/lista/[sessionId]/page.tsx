import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getSessionById, isRsvpOpen } from "@/utils/sessions";
import type { PresenceStatus } from "@/types/supabase";
import { ConfirmButton } from "./ConfirmButton";

export default async function ListaPage({
  params,
}: PageProps<"/lista/[sessionId]">) {
  const { sessionId } = await params;
  const supabase = await createClient();

  const session = await getSessionById(supabase, sessionId);

  if (!session) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <p className="text-4xl">⚠️</p>
        <h1 className="text-xl font-semibold">Lista não encontrada</h1>
        <p className="text-sm text-foreground/60">
          Confira se o link está correto ou peça um novo link ao admin.
        </p>
        <Link href="/" className="text-sm underline underline-offset-4">
          Voltar para o início
        </Link>
      </div>
    );
  }

  const [{ data: players }, { data: presences }, { count: confirmedCount }] =
    await Promise.all([
      supabase
        .from("players")
        .select("id, name, type, has_pin")
        .order("name"),
      supabase
        .from("session_presences")
        .select("id, player_id, status, rsvp_timestamp, players(id, name)")
        .eq("session_id", sessionId)
        .order("rsvp_timestamp", { ascending: true })
        .overrideTypes<
          Array<{
            id: string;
            player_id: string;
            status: PresenceStatus;
            rsvp_timestamp: string | null;
            players: { id: string; name: string } | null;
          }>,
          { merge: false }
        >(),
      supabase
        .from("session_presences")
        .select("id", { count: "exact", head: true })
        .eq("session_id", sessionId)
        .eq("status", "confirmed"),
    ]);

  const gate = isRsvpOpen(session, confirmedCount ?? 0);

  const presenceByPlayer = new Map(
    (presences ?? []).map((presence) => [presence.player_id, presence]),
  );

  const confirmed = (presences ?? []).filter((p) => p.status === "confirmed");
  const waitlist = (presences ?? []).filter(
    (p) => p.status === "pending_waitlist",
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Lista de Presença da Semana</h1>
          <p className="text-sm text-foreground/60">
            Sessão de{" "}
            {new Date(`${session.sessionDate}T00:00:00.000Z`).toLocaleDateString(
              "pt-BR",
              { timeZone: "UTC" },
            )}
          </p>
        </div>
        <Link href="/" className="text-sm underline underline-offset-4">
          Início
        </Link>
      </div>

      {!gate.open && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          🔒 {gate.reason}
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
          Jogadores
        </h2>
        <ul className="flex flex-col gap-2 sm:gap-0 sm:divide-y sm:divide-foreground/10 sm:rounded-lg sm:border sm:border-foreground/10 sm:bg-card">
          {(players ?? []).map((player) => {
            const presence = presenceByPlayer.get(player.id);
            return (
              <li
                key={player.id}
                className="flex flex-col gap-2 rounded-lg border border-foreground/10 bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:rounded-none sm:border-0 sm:p-3 sm:px-4"
              >
                <div>
                  <p className="text-sm font-medium">{player.name}</p>
                  <p className="text-xs text-foreground/50">
                    {player.type === "mensalista" ? "Mensalista" : "Diarista"}
                  </p>
                </div>
                {presence ? (
                  <StatusBadge status={presence.status} />
                ) : gate.open ? (
                  <ConfirmButton
                    sessionId={sessionId}
                    playerId={player.id}
                    hasPin={player.has_pin ?? false}
                  />
                ) : (
                  <span className="text-xs text-foreground/40">Encerrado</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <PresenceList title="✅ Confirmados" entries={confirmed} />
        <PresenceList title="⏳ Fila de Espera" entries={waitlist} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    confirmed: "Confirmado",
    pending_waitlist: "Na fila de espera",
    checked_in_field: "Em campo",
  };

  return (
    <span className="rounded-full bg-foreground/10 px-3 py-1 text-xs font-medium">
      {labels[status] ?? status}
    </span>
  );
}

function PresenceList({
  title,
  entries,
}: {
  title: string;
  entries: { id: string; players: { name: string } | null }[];
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
        {title} ({entries.length})
      </h2>
      {entries.length === 0 ? (
        <p className="text-sm text-foreground/40">Ninguém aqui ainda.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {entries.map((entry, index) => (
            <li
              key={entry.id}
              className="flex items-center gap-3 rounded-md border border-foreground/10 px-3 py-2 text-sm"
            >
              <span className="text-xs font-mono text-foreground/40">
                {index + 1}
              </span>
              {entry.players?.name ?? "Jogador"}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
