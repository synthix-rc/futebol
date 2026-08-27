"use client";

import { useState, useTransition } from "react";
import { generateNextSession } from "@/app/actions/sessions";

/**
 * "Gerar Lista" now opens a session on whatever date the admin picks —
 * pre-filled with next Sunday to keep the common case a single click, but
 * freely editable so an extra midweek pelada is just a different date
 * (see generateNextSession, which validates/enforces this server-side;
 * `min` here is only a browser-native nudge, not the real guard).
 */
export function GenerateSessionButton({
  disabled,
  defaultDate,
  minDate,
}: {
  disabled: boolean;
  defaultDate: string;
  minDate: string;
}) {
  const [date, setDate] = useState(defaultDate);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex w-full flex-col items-center gap-2 sm:w-auto">
      <label className="flex w-full flex-col gap-1 text-left text-xs text-foreground/60 sm:w-56">
        Data da pelada
        <input
          type="date"
          value={date}
          min={minDate}
          disabled={disabled || isPending}
          onChange={(event) => setDate(event.target.value)}
          className="min-h-11 w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50 [color-scheme:dark]"
        />
      </label>
      <button
        type="button"
        disabled={disabled || isPending || !date}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await generateNextSession(date);
            if (!result.success) {
              setError(result.message ?? "Erro ao gerar a lista.");
            }
          });
        }}
        className="min-h-11 w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 sm:w-auto"
      >
        {isPending ? "Gerando…" : "Gerar Lista"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
