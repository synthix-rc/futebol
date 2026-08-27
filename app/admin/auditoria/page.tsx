import { createClient } from "@/utils/supabase/server";
import type { Json } from "@/types/supabase";
import { PlayerAvatar } from "@/app/admin/jogadores/PlayerAvatar";

const ACTION_LABELS: Record<string, string> = {
  update_player_quick_edit: "✏️ Editou notas/tipo do jogador",
  update_player_profile: "✏️ Editou perfil do jogador",
  register_payment: "💰 Registrou pagamento",
  create_expense: "💸 Registrou despesa",
  finish_match: "⚔️ Encerrou partida (Súmula)",
  close_session: "🔒 Encerrou sessão",
  update_admin_profile: "👤 Atualizou o próprio perfil",
};

const ENTITY_LABELS: Record<string, string> = {
  player: "Jogador",
  payment: "Pagamento",
  expense: "Despesa",
  match: "Partida",
  session: "Sessão",
  admin_profiles: "Perfil do Admin",
};

type LogRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Json | null;
  created_at: string;
  admin_profiles: { nome: string | null; photo_url: string | null } | null;
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const dateLabel = date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const timeLabel = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  return `${dateLabel} às ${timeLabel}`;
}

/**
 * Audit Trail timeline — every mutation that calls utils/audit.ts's
 * logAction shows up here, newest first, with the acting admin's own
 * avatar/name (from admin_profiles, edited at /admin/configuracoes)
 * attached. Read-only, admin-authenticated by /admin/layout.tsx same as
 * every other page under /admin — no extra guard needed here.
 */
export default async function AuditoriaPage() {
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, details, created_at, admin_profiles(nome, photo_url)")
    .order("created_at", { ascending: false })
    .limit(200)
    .overrideTypes<LogRow[], { merge: false }>();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold">📜 Auditoria</h1>
        <p className="text-sm text-foreground/60">
          Trilha das ações administrativas — quem fez o quê, e quando.
        </p>
      </div>

      {!logs || logs.length === 0 ? (
        <p className="rounded-lg border border-foreground/10 bg-card px-4 py-6 text-center text-sm text-foreground/40">
          Nenhuma ação registrada ainda.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {logs.map((log) => (
            <AuditLogItem key={log.id} log={log} />
          ))}
        </ul>
      )}
    </div>
  );
}

function AuditLogItem({ log }: { log: LogRow }) {
  const adminName = log.admin_profiles?.nome?.trim() || "Admin";
  const actionLabel = ACTION_LABELS[log.action] ?? log.action;
  const entityLabel = ENTITY_LABELS[log.entity_type] ?? log.entity_type;

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-foreground/10 bg-card p-4">
      <div className="flex items-start gap-3">
        <PlayerAvatar photoUrl={log.admin_profiles?.photo_url ?? null} name={adminName} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
            <span className="truncate text-sm font-semibold">{adminName}</span>
            <span className="whitespace-nowrap text-[11px] text-foreground/40">
              {formatTimestamp(log.created_at)}
            </span>
          </div>
          <span className="text-sm">{actionLabel}</span>
          <span className="text-xs text-foreground/50">
            {entityLabel}
            {log.entity_id ? ` · ${log.entity_id.slice(0, 8)}…` : ""}
          </span>
        </div>
      </div>

      {log.details !== null && (
        <details className="group">
          <summary className="min-h-9 w-fit cursor-pointer list-none rounded-md px-2 py-1 text-xs font-medium text-foreground/50 transition-colors hover:bg-foreground/5 hover:text-foreground">
            <span className="inline-block transition-transform group-open:rotate-90">▸</span>{" "}
            Ver detalhes
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-md bg-foreground/[0.04] p-3 text-[11px] leading-relaxed text-foreground/70">
            {JSON.stringify(log.details, null, 2)}
          </pre>
        </details>
      )}
    </li>
  );
}
