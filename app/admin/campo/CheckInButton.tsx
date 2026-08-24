"use client";

import { useState, useTransition } from "react";
import { checkInPlayer } from "@/app/actions/match";

export function CheckInButton({ presenceId }: { presenceId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex w-full flex-col items-end gap-1 sm:w-auto">
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
        className="min-h-11 w-full rounded-md border border-foreground/20 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-foreground/5 disabled:opacity-50 sm:w-auto"
      >
        {isPending ? "Registrando…" : "Check-in no Campo"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
