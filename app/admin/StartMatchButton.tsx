"use client";

import { useState, useTransition } from "react";
import { startFirstMatch } from "@/app/actions/match";

export function StartMatchButton({ queueSize }: { queueSize: number }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const canStart = queueSize >= 12;

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={isPending || !canStart}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await startFirstMatch();
            if (!result.success) {
              setError(result.message ?? "Erro ao iniciar a partida.");
            }
          });
        }}
        className="rounded-lg bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {isPending ? "Iniciando…" : "Iniciar Primeira Partida"}
      </button>
      <p className="text-xs text-foreground/50">
        {canStart
          ? "12 jogadores prontos na fila."
          : `Aguardando fila: ${queueSize}/12 jogadores.`}
      </p>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
