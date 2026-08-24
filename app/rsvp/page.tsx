import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { PresenceStatus } from "@/types/supabase";
import { ConfirmButton } from "./ConfirmButton";

export default async function RsvpPage() {
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
          Ainda não há uma pelada aberta para esta semana. Volte mais tarde.
        </p>
        <Link href="/" className="text-sm underline underline-offset-4">
          Voltar para o início
        </Link>
      </div>
    );
  }

  // Ordered by `rsvp_timestamp` (how fast the player confirmed during the
  // week) — the Friday diarista-cutoff clock. This is deliberately not
  // `check_in_timestamp`, which stays null until the admin checks the
  // player in at the field on Sunday and drives the FIFO match queue
  // instead (see utils/queue.ts).
  const [{ data: players }, { data: presences }] = await Promise.all([
    supabase.from("players").select("id, name, type").order("name"),
    supabase
      .from("session_presences")
      .select("id, player_id, status, rsvp_timestamp, players(id, name)")
      .eq("session_id", session.id)
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
  ]);

  const presenceByPlayer = new Map(
    (presences ?? []).map((presence) => [presence.player_id, presence]),
  );

  const confirmed = (presences ?? []).filter((p) => p.status === "confirmed");
  const waitlist = (presences ?? []).filter(
    (p) => p.status === "pending_waitlist",
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lista de Presença da Semana</h1>
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

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
          Jogadores
        </h2>
        <ul className="divide-y divide-foreground/10 rounded-lg border border-foreground/10">
          {(players ?? []).map((player) => {
            const presence = presenceByPlayer.get(player.id);
            return (
              <li
                key={player.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{player.name}</p>
                  <p className="text-xs text-foreground/50">
                    {player.type === "mensalista" ? "Mensalista" : "Diarista"}
                  </p>
                </div>
                {presence ? (
                  <StatusBadge status={presence.status} />
                ) : (
                  <ConfirmButton playerId={player.id} />
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
    checked_in_field: "Em quadra",
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
