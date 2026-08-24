import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-16 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          ⚽ Gestão de Pelada
        </h1>
        <p className="max-w-md text-sm text-foreground/60">
          Fila de prioridade FIFO para organizar presença e rodízio de times
          no dia do jogo.
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-4">
        <Link
          href="/rsvp"
          className="rounded-lg bg-foreground px-6 py-4 text-sm font-semibold text-background transition-opacity hover:opacity-90"
        >
          Lista de Presença da Semana
        </Link>
        <Link
          href="/admin"
          className="rounded-lg border border-foreground/20 px-6 py-4 text-sm font-semibold transition-colors hover:bg-foreground/5"
        >
          Painel do Admin (Domingo)
        </Link>
      </div>
    </div>
  );
}
