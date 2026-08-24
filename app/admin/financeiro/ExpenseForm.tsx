"use client";

import { useState } from "react";
import { useTransition } from "react";
import { createExpense } from "@/app/actions/finance";
import type { ExpenseCategory } from "@/types/supabase";
import { ReceiptUploadField } from "./ReceiptUploadField";

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  campo: "Campo",
  material: "Material",
  goleiro: "Goleiro",
  churrasco: "Churrasco",
  outros: "Outros",
};

export function ExpenseForm({
  sessionId,
  players,
}: {
  sessionId: string | null;
  players: { id: string; name: string }[];
}) {
  const todayISO = new Date().toISOString().slice(0, 10);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(todayISO);
  const [category, setCategory] = useState<ExpenseCategory>("outros");
  const [paidByPlayerId, setPaidByPlayerId] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const parsedAmount = Number(amount.replace(",", "."));
  const canSubmit =
    description.trim().length > 0 && Number.isFinite(parsedAmount) && parsedAmount > 0;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await createExpense({
        description,
        amount: parsedAmount,
        expenseDate,
        category,
        sessionId,
        paidByPlayerId: paidByPlayerId || null,
        receiptUrl,
      });
      if (!result.success) {
        setError(result.message ?? "Erro ao registrar despesa.");
        return;
      }
      setDescription("");
      setAmount("");
      setExpenseDate(todayISO);
      setCategory("outros");
      setPaidByPlayerId("");
      setReceiptUrl(null);
      setSuccess(true);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-foreground/10 p-4"
    >
      <label className="flex flex-col gap-1 text-sm">
        Descrição
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Ex: Aluguel da quadra"
          className="min-h-11 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Valor (R$)
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
        <label className="flex flex-col gap-1 text-sm">
          Data
          <input
            type="date"
            value={expenseDate}
            onChange={(event) => setExpenseDate(event.target.value)}
            className="min-h-11 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Categoria
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
          className="min-h-11 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
        >
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Pago do bolso por (opcional)
        <select
          value={paidByPlayerId}
          onChange={(event) => setPaidByPlayerId(event.target.value)}
          className="min-h-11 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
        >
          <option value="">Caixa (ninguém)</option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name}
            </option>
          ))}
        </select>
      </label>

      <ReceiptUploadField folder="expenses" onUploaded={setReceiptUrl} />

      {error && <p className="text-xs text-red-500">{error}</p>}
      {success && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          Despesa registrada!
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !canSubmit}
        className="min-h-11 rounded-md bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {isPending ? "Salvando…" : "Registrar Despesa"}
      </button>
    </form>
  );
}
