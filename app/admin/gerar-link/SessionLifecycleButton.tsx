"use client";

import { useState, useTransition } from "react";
import { closeSession, startSundaySession } from "@/app/actions/sessions";

const CONFIG = {
  start: {
    label: "Iniciar Sessão de Domingo",
    pendingLabel: "Iniciando…",
    action: startSundaySession,
  },
  close: {
    label: "Encerrar Sessão",
    pendingLabel: "Encerrando…",
    action: closeSession,
  },
} as const;

export function SessionLifecycleButton({
  sessionId,
  action,
}: {
  sessionId: string;
  action: keyof typeof CONFIG;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const config = CONFIG[action];

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await config.action(sessionId);
            if (!result.success) {
              setError(result.message ?? "Erro ao atualizar a sessão.");
            }
          });
        }}
        className="rounded-md border border-foreground/20 px-4 py-2 text-sm font-semibold transition-colors hover:bg-foreground/5 disabled:opacity-50"
      >
        {isPending ? config.pendingLabel : config.label}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
