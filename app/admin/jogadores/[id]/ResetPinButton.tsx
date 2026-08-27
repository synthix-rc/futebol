"use client";

import { useState, useTransition } from "react";
import { resetPlayerPin } from "@/app/actions/players";

/**
 * "Esqueci meu PIN" escape hatch — clears `players.pin` so the player's
 * next RSVP prompts them to set a fresh one (see confirmPresence in
 * app/actions/rsvp.ts, which only ever moves a PIN from null to set or
 * confirms a match; it has no path back to null on its own). Only rendered
 * once the player actually has a PIN (see PlayerHeader) — resetting an
 * already-empty one is a no-op not worth surfacing.
 */
export function ResetPinButton({ playerId }: { playerId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleReset() {
    if (!window.confirm("Resetar o PIN deste jogador? Ele vai criar um novo na próxima confirmação de presença.")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await resetPlayerPin(playerId);
      if (!result.success) {
        setError(result.message ?? "Erro ao resetar o PIN.");
        return;
      }
      setDone(true);
    });
  }

  if (done) {
    return (
      <span className="whitespace-nowrap rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        ✅ PIN resetado
      </span>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={handleReset}
        title="Limpa o PIN do jogador — ele cria um novo na próxima confirmação"
        className="min-h-9 whitespace-nowrap rounded-full border border-foreground/20 px-3 py-1 text-xs font-medium text-foreground/60 transition-colors hover:bg-foreground/5 disabled:opacity-50"
      >
        {isPending ? "Resetando…" : "🔑 Resetar PIN"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
