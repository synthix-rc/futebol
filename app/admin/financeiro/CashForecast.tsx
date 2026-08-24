"use client";

import { useState } from "react";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/**
 * "Previsibilidade de Caixa": Receita Esperada vs Realizada, Despesas do
 * mês, and Saldo Projetado = Esperada - Despesas.
 *
 * There's no stored "monthly fee" anywhere in the schema (payments.amount
 * is entered per-payment, ad hoc), so Receita Esperada can't be looked up
 * — it's estimated as `mensalidade assumida × total de mensalistas`. The
 * server seeds a reasonable default (the average of mensalidades already
 * paid this month, or the fee from other months as a fallback), and the
 * admin can override it here; nothing about the override is persisted.
 */
export function CashForecast({
  mensalistaCount,
  realizedRevenue,
  expensesThisMonth,
  suggestedFee,
}: {
  mensalistaCount: number;
  realizedRevenue: number;
  expensesThisMonth: number;
  suggestedFee: number;
}) {
  const [fee, setFee] = useState(suggestedFee);

  const expectedRevenue = fee * mensalistaCount;
  const projectedBalance = expectedRevenue - expensesThisMonth;
  const realizedPct =
    expectedRevenue > 0 ? Math.min(100, (realizedRevenue / expectedRevenue) * 100) : 0;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-foreground/10 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
          📈 Previsibilidade de Caixa (mês)
        </h3>
        <label className="flex items-center gap-2 text-xs text-foreground/60">
          Mensalidade estimada
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={fee}
            onChange={(event) => setFee(Number(event.target.value) || 0)}
            className="min-h-9 w-24 rounded-md border border-foreground/20 bg-background px-2 py-1.5 text-xs"
          />
        </label>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/10">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${realizedPct}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Esperada" value={currency.format(expectedRevenue)} />
        <Stat label="Realizada" value={currency.format(realizedRevenue)} />
        <Stat label="Despesas" value={currency.format(expensesThisMonth)} />
        <Stat
          label="Saldo Projetado"
          value={currency.format(projectedBalance)}
          highlight={projectedBalance < 0 ? "negative" : "positive"}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "positive" | "negative";
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-foreground/40">
        {label}
      </span>
      <span
        className={`text-sm font-semibold ${
          highlight === "negative"
            ? "text-red-500"
            : highlight === "positive"
              ? "text-emerald-600 dark:text-emerald-400"
              : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
