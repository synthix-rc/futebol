"use client";

import { useState, useTransition } from "react";
import { generateNextSession } from "@/app/actions/sessions";

export function GenerateSessionButton({ disabled }: { disabled: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={disabled || isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await generateNextSession();
            if (!result.success) {
              setError(result.message ?? "Erro ao gerar a lista.");
            }
          });
        }}
        className="rounded-lg bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {isPending ? "Gerando…" : "Gerar Lista (Próximo Domingo)"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
