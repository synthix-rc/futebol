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
    <div className="flex flex-col items-end gap-1">
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
        className="rounded-md bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Confirmando…" : "Confirmar Presença"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
