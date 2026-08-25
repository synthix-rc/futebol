"use client";

import { useState, useTransition } from "react";
import { registerPayment } from "@/app/actions/finance";
import type { PaymentCategory } from "@/types/supabase";
import { ReceiptUploadField } from "../ReceiptUploadField";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const CATEGORY_OPTIONS: Array<{ value: PaymentCategory; label: string }> = [
  { value: "campo", label: "⚽ Campo/Mensalidade" },
  { value: "churrasco", label: "🥩 Churrasco" },
];

/**
 * Mensalidade mark-paid, scoped to one player — lives on the ficha
 * (PlayersTable's sidepanel) rather than as one long list on
 * /admin/financeiro, since a monthly fee is inherently a per-player thing
 * (payments.session_id is always null for it), not tied to any one day's
 * session the way a diária is.
 */
export function MensalidadeStatus({
  playerId,
  referenceMonth,
  paid,
  amount,
}: {
  playerId: string;
  referenceMonth: string;
  paid: boolean;
  amount: number | null;
}) {
  const [isPaid, setIsPaid] = useState(paid);
  const [paidAmount, setPaidAmount] = useState(amount);
  const [category, setCategory] = useState<PaymentCategory>("campo");
  const [amountInput, setAmountInput] = useState<string>(amount != null ? String(amount) : "");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const parsedAmount = Number(amountInput.replace(",", "."));
  const canSubmit = Number.isFinite(parsedAmount) && parsedAmount > 0;

  function handleMarkPaid() {
    setError(null);
    startTransition(async () => {
      const result = await registerPayment({
        playerId,
        sessionId: null,
        amount: parsedAmount,
        type: "mensalidade",
        referenceMonth,
        receiptUrl,
        category,
      });
      if (!result.success) {
        setError(result.message ?? "Erro ao registrar pagamento.");
        return;
      }
      setIsPaid(true);
      setPaidAmount(parsedAmount);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {isPaid ? (
        <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
          ✅ Pago{paidAmount != null ? ` — ${currency.format(paidAmount)}` : ""}
        </span>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-xs text-foreground/60">
            Categoria
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as PaymentCategory)}
              required
              className="min-h-11 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            placeholder="Valor (R$)"
            value={amountInput}
            onChange={(event) => setAmountInput(event.target.value)}
            className="min-h-11 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
          />
          <ReceiptUploadField folder="payments" onUploaded={setReceiptUrl} />
          <button
            type="button"
            disabled={isPending || !canSubmit}
            onClick={handleMarkPaid}
            className="min-h-11 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {isPending ? "Salvando…" : "Marcar Pago"}
          </button>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      )}
    </div>
  );
}
