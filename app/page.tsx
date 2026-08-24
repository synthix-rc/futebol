import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getOpenForRsvpSession } from "@/utils/sessions";

export default async function Home() {
  const supabase = await createClient();
  const openSession = await getOpenForRsvpSession(supabase);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-16 text-center">
      <div className="flex flex-col items-center gap-4">
        <Image
          src="/logo-futebol.png"
          alt="Resenha Sesi Senai e Amigos"
          width={112}
          height={112}
          priority
          className="h-12 w-12 sm:h-16 sm:w-16"
        />
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Resenha Sesi Senai e Amigos
        </h1>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-4">
        {openSession ? (
          <Link
            href={`/lista/${openSession.id}`}
            className="rounded-lg bg-primary px-6 py-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Lista de Presença da Semana
          </Link>
        ) : (
          <span className="cursor-not-allowed rounded-lg border border-dashed border-foreground/20 px-6 py-4 text-sm font-semibold text-foreground/40">
            Nenhuma lista aberta no momento
          </span>
        )}
        <Link
          href="/admin"
          className="rounded-lg border border-foreground/20 px-6 py-4 text-sm font-semibold transition-colors hover:bg-foreground/5"
        >
          Painel do Admin
        </Link>
        <Link
          href="/financeiro-publico"
          className="rounded-lg border border-foreground/20 px-6 py-4 text-sm font-semibold transition-colors hover:bg-foreground/5"
        >
          Extrato Financeiro
        </Link>
      </div>
    </div>
  );
}
