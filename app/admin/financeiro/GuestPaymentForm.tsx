"use client";

import { useState, useTransition } from "react";
import { registerGuestPayment, type GuestPaymentDestination } from "@/app/actions/finance";

const DESTINATIONS: Array<{ value: GuestPaymentDestination; label: string }> = [
  { value: "campo", label: "⚽ Campo" },
  { value: "churrasco", label: "🥩 Churrasco" },
  { value: "ambos", label: "🔀 Ambos" },
];

/**
 * "Receita Avulsa" — replaces the old per-diarista "Visão do Dia"
 * billing now that diaristas aren't registered as players at all. Just a
 * name (never a `players` row) and a value; "Ambos" splits the value into
 * two payments (one 'campo', one 'churrasco') server-side, transparently
 * to whoever fills this in.
 */
export function GuestPaymentForm() {
  const [name, setName] = useState("");
  const [destination, setDestination] = useState<GuestPaymentDestination>("campo");
  const [amount, setAmount] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const parsedAmount = Number(amount.replace(",", "."));
  const canSubmit = name.trim().length > 0 && Number.isFinite(parsedAmount) && parsedAmount > 0;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await registerGuestPayment(name, destination, parsedAmount);
      if (!result.success) {
        setError(result.message ?? "Erro ao registrar pagamento.");
        return;
      }
      setName("");
      setDestination("campo");
      setAmount("");
      setSuccess(true);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-foreground/10 bg-card p-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          Nome
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome do diarista"
            className="min-h-11 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Destino
          <select
            value={destination}
            onChange={(event) => setDestination(event.target.value as GuestPaymentDestination)}
            className="min-h-11 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
          >
            {DESTINATIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Valor Total (R$)
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0,00"
            className="min-h-11 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
          />
        </label>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {success && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          Pagamento registrado!
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !canSubmit}
        className="min-h-11 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {isPending ? "Registrando…" : "Registrar Pagamento"}
      </button>
    </form>
  );
}
