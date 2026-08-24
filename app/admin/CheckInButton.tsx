"use client";

import { useState, useTransition } from "react";
import { checkInPlayer } from "@/app/actions/match";

export function CheckInButton({ presenceId }: { presenceId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await checkInPlayer(presenceId);
            if (!result.success) {
              setError(result.message ?? "Erro ao fazer check-in.");
            }
          });
        }}
        className="rounded-md border border-foreground/20 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-foreground/5 disabled:opacity-50"
      >
        {isPending ? "Registrando…" : "Check-in na Quadra"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
