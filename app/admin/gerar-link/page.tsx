import { createClient } from "@/utils/supabase/server";
import {
  getInProgressSession,
  getOpenForRsvpSession,
  getRecentSessions,
} from "@/utils/sessions";
import type { SessionStatus } from "@/types/supabase";
import { CopyLinkButton } from "./CopyLinkButton";
import { GenerateSessionButton } from "./GenerateSessionButton";
import { SessionLifecycleButton } from "./SessionLifecycleButton";

export default async function GerarLinkPage() {
  const supabase = await createClient();

  const [openSession, inProgressSession, recentSessions] = await Promise.all([
    getOpenForRsvpSession(supabase),
    getInProgressSession(supabase),
    getRecentSessions(supabase, 5),
  ]);

  const hasOpenOrActive = Boolean(openSession || inProgressSession);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold">Gerar Link (Próxima Pelada)</h1>
        <p className="text-sm text-foreground/60">
          Abra a lista de presença da semana e compartilhe o link com o grupo.
        </p>
      </div>

      <section className="flex flex-col items-center gap-3 rounded-lg border border-foreground/10 p-6 text-center">
        <GenerateSessionButton disabled={hasOpenOrActive} />
        {hasOpenOrActive && (
          <p className="text-xs text-foreground/50">
            Já existe uma sessão aberta ou em andamento — encerre-a antes de
            gerar outra.
          </p>
        )}
      </section>

      {openSession && (
        <section className="flex flex-col gap-3 rounded-lg border border-foreground/10 p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
              📋 Lista Aberta — {formatDate(openSession.sessionDate)}
            </h2>
            <StatusBadge status={openSession.status} />
          </div>
          <CopyLinkButton path={`/lista/${openSession.id}`} />
          <SessionLifecycleButton sessionId={openSession.id} action="start" />
        </section>
      )}

      {inProgressSession && (
        <section className="flex flex-col gap-3 rounded-lg border border-foreground/10 p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
              ⚔️ Em Andamento — {formatDate(inProgressSession.sessionDate)}
            </h2>
            <StatusBadge status={inProgressSession.status} />
          </div>
          <a
            href="/admin/quadra"
            className="text-sm underline underline-offset-4"
          >
            Ir para a Quadra →
          </a>
          <SessionLifecycleButton sessionId={inProgressSession.id} action="close" />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
          Histórico (últimas {recentSessions.length})
        </h2>
        {recentSessions.length === 0 ? (
          <p className="text-sm text-foreground/40">
            Nenhuma sessão criada ainda.
          </p>
        ) : (
          <ul className="divide-y divide-foreground/10 rounded-lg border border-foreground/10">
            {recentSessions.map((session) => (
              <li
                key={session.id}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
              >
                <span>{formatDate(session.sessionDate)}</span>
                <StatusBadge status={session.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatDate(sessionDate: string) {
  return new Date(`${sessionDate}T00:00:00.000Z`).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
}

const STATUS_LABELS: Record<SessionStatus, string> = {
  open_for_rsvp: "Aberta para RSVP",
  in_progress: "Em andamento",
  closed: "Encerrada",
};

const STATUS_STYLES: Record<SessionStatus, string> = {
  open_for_rsvp: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  in_progress: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  closed: "bg-foreground/10 text-foreground/50",
};

function StatusBadge({ status }: { status: SessionStatus }) {
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
