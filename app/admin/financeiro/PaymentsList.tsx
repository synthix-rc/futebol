"use client";

import { useState, useTransition } from "react";
import { registerPayment } from "@/app/actions/finance";
import type { PaymentType } from "@/types/supabase";
import { ReceiptUploadField } from "../ReceiptUploadField";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export type PaymentRowData = {
  id: string;
  name: string;
  paid: boolean;
  amount: number | null;
  receiptUrl?: string | null;
};

export function PaymentsList({
  type,
  sessionId,
  referenceMonth,
  rows,
}: {
  type: PaymentType;
  sessionId: string | null;
  referenceMonth: string;
  rows: PaymentRowData[];
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-foreground/40">Ninguém aqui ainda.</p>;
  }

  return (
    <ul className="flex flex-col gap-3 sm:gap-0 sm:divide-y sm:divide-foreground/10 sm:rounded-lg sm:border sm:border-foreground/10">
      {rows.map((row) => (
        <PaymentRow
          key={row.id}
          type={type}
          sessionId={sessionId}
          referenceMonth={referenceMonth}
          row={row}
        />
      ))}
    </ul>
  );
}

function PaymentRow({
  type,
  sessionId,
  referenceMonth,
  row,
}: {
  type: PaymentType;
  sessionId: string | null;
  referenceMonth: string;
  row: PaymentRowData;
}) {
  const [paid, setPaid] = useState(row.paid);
  const [paidAmount, setPaidAmount] = useState(row.amount);
  const [amount, setAmount] = useState<string>(
    row.amount != null ? String(row.amount) : "",
  );
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const parsedAmount = Number(amount.replace(",", "."));
  const canSubmit = Number.isFinite(parsedAmount) && parsedAmount > 0;

  function handleMarkPaid() {
    setError(null);
    startTransition(async () => {
      const result = await registerPayment({
        playerId: row.id,
        sessionId,
        amount: parsedAmount,
        type,
        referenceMonth,
        receiptUrl,
      });
      if (!result.success) {
        setError(result.message ?? "Erro ao registrar pagamento.");
        return;
      }
      setPaid(true);
      setPaidAmount(parsedAmount);
    });
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-foreground/10 p-4 sm:rounded-none sm:border-0 sm:p-4">
      <span className="font-medium">{row.name}</span>

      {paid ? (
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
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
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
    </li>
  );
}
