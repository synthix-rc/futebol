import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getInProgressSession, getOpenForRsvpSession } from "@/utils/sessions";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [inProgress, openForRsvp, { count: playerCount }] = await Promise.all([
    getInProgressSession(supabase),
    getOpenForRsvpSession(supabase),
    supabase.from("players").select("id", { count: "exact", head: true }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-foreground/60">Visão geral da pelada.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatusCard
          title="⚔️ Sessão em Andamento"
          value={inProgress ? formatDate(inProgress.sessionDate) : "Nenhuma"}
          href="/admin/quadra"
          cta="Ir para a Quadra"
        />
        <StatusCard
          title="📋 Lista Aberta"
          value={openForRsvp ? formatDate(openForRsvp.sessionDate) : "Nenhuma"}
          href="/admin/gerar-link"
          cta="Gerenciar"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <QuickLink
          href="/admin/jogadores"
          icon="👥"
          label="Ficha de Jogadores"
          description={`${playerCount ?? 0} jogadores cadastrados`}
        />
        <QuickLink
          href="/admin/financeiro"
          icon="💰"
          label="Financeiro"
          description="Caixa e mensalidades"
        />
        <QuickLink
          href="/admin/gerar-link"
          icon="🔗"
          label="Gerar Link"
          description="Abrir a próxima pelada"
        />
      </div>
    </div>
  );
}

function formatDate(sessionDate: string) {
  return new Date(`${sessionDate}T00:00:00.000Z`).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
}

function StatusCard({
  title,
  value,
  href,
  cta,
}: {
  title: string;
  value: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-foreground/10 p-6">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
        {title}
      </h2>
      <p className="text-2xl font-bold">{value}</p>
      <Link href={href} className="text-sm underline underline-offset-4">
        {cta} →
      </Link>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
  description,
}: {
  href: string;
  icon: string;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1 rounded-lg border border-foreground/10 p-5 transition-colors hover:bg-foreground/5"
    >
      <span className="text-xl" aria-hidden="true">
        {icon}
      </span>
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-xs text-foreground/50">{description}</span>
    </Link>
  );
}
