"use client";

import { useState, useTransition } from "react";
import { registerPayment } from "@/app/actions/finance";
import { ReceiptUploadField } from "../ReceiptUploadField";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

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
  monthLabel,
  paid,
  amount,
}: {
  playerId: string;
  referenceMonth: string;
  monthLabel: string;
  paid: boolean;
  amount: number | null;
}) {
  const [isPaid, setIsPaid] = useState(paid);
  const [paidAmount, setPaidAmount] = useState(amount);
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
      <p className="text-xs text-foreground/50">Mensalidade — {monthLabel}</p>

      {isPaid ? (
        <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
          ✅ Pago{paidAmount != null ? ` — ${currency.format(paidAmount)}` : ""}
        </span>
      ) : (
        <div className="flex flex-col gap-2">
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
            className="min-h-11 rounded-md bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {isPending ? "Salvando…" : "Marcar Pago"}
          </button>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      )}
    </div>
  );
}
