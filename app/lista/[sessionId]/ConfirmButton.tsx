"use client";

import { useState, useTransition } from "react";
import { confirmPresence } from "@/app/actions/rsvp";

/**
 * Two steps: tapping "Confirmar Presença" reveals a 4-digit PIN input
 * instead of confirming outright — the PIN (see the migration adding
 * `players.pin`) is what stops one player from checking off someone else's
 * name on the shared public list. The label tells them which situation
 * they're in: `hasPin` false means this is their first RSVP ever, so
 * they're *creating* the PIN they'll reuse every week from now on; true
 * means they need to reproduce the one they already set.
 */
export function ConfirmButton({
  sessionId,
  playerId,
  hasPin,
}: {
  sessionId: string;
  playerId: string;
  hasPin: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pin.length !== 4) {
      setError("Digite os 4 números do PIN.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await confirmPresence(sessionId, playerId, pin);
      if (!result.success) {
        setError(result.message ?? "Erro ao confirmar presença.");
        return;
      }
      // Success re-renders this row as a StatusBadge from the parent
      // (revalidatePath), so no local "confirmed" state to reset here.
    });
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="min-h-11 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
      >
        Confirmar Presença
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col items-stretch gap-1.5 rounded-md border border-foreground/15 bg-background p-3 sm:w-64"
    >
      <label className="text-xs text-foreground/60">
        {hasPin
          ? "Digite seu PIN de 4 dígitos"
          : "Crie um PIN de 4 dígitos (você usará sempre)"}
      </label>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        autoFocus
        value={pin}
        onChange={(event) => {
          setError(null);
          setPin(event.target.value.replace(/\D/g, "").slice(0, 4));
        }}
        className="min-h-11 rounded-md border border-foreground/20 bg-card px-3 py-2 text-center font-mono text-lg tracking-[0.5em]"
        placeholder="••••"
      />
      {error && <p className="text-xs text-red-500">⚠️ {error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending || pin.length !== 4}
          className="min-h-11 flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Confirmando…" : "Confirmar"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setIsOpen(false);
            setPin("");
            setError(null);
          }}
          className="min-h-11 rounded-md border border-foreground/20 px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-foreground/5 disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
