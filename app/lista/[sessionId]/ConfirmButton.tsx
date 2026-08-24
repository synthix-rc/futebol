"use client";

import { useState, useTransition } from "react";
import { confirmPresence } from "@/app/actions/rsvp";

export function ConfirmButton({
  sessionId,
  playerId,
}: {
  sessionId: string;
  playerId: string;
}) {
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
            const result = await confirmPresence(sessionId, playerId);
            if (!result.success) {
              setError(result.message ?? "Erro ao confirmar presença.");
            }
          });
        }}
        className="min-h-11 w-full rounded-md bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
      >
        {isPending ? "Confirmando…" : "Confirmar Presença"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
