"use client";

import { useState } from "react";
import {
  computeCashHealth,
  CURRENT_DIARIA_FEE,
  CURRENT_MENSALIDADE_FEE,
} from "@/utils/dashboardMetrics";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/**
 * "Saúde do Caixa": suggests new mensalidade/diária values when the
 * trailing-3-month expense average would outrun what today's prices bring
 * in. The current prices are editable here (there's no stored "fee"
 * anywhere in the schema — see utils/dashboardMetrics.ts) so the
 * suggestion stays useful after a real price change.
 */
export function CashHealthCard({
  avgMonthlyExpenses,
  mensalistaCount,
  avgDiaristasPerMonth,
}: {
  avgMonthlyExpenses: number;
  mensalistaCount: number;
  avgDiaristasPerMonth: number;
}) {
  const [mensalidade, setMensalidade] = useState(CURRENT_MENSALIDADE_FEE);
  const [diaria, setDiaria] = useState(CURRENT_DIARIA_FEE);

  const result = computeCashHealth({
    avgMonthlyExpenses,
    mensalistaCount,
    avgDiaristasPerMonth,
    currentMensalidade: mensalidade,
    currentDiaria: diaria,
  });

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-foreground/10 p-6">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
          🩺 Saúde do Caixa
        </h2>
        <p className="mt-1 text-xs text-foreground/50">
          Baseado na despesa média dos últimos 3 meses vs. a receita que os
          preços atuais trariam.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs">
          Mensalidade atual (R$)
          <input
            type="number"
            min={0}
            step="1"
            inputMode="decimal"
            value={mensalidade}
            onChange={(event) => setMensalidade(Number(event.target.value) || 0)}
            className="min-h-11 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Diária atual (R$)
          <input
            type="number"
            min={0}
            step="1"
            inputMode="decimal"
            value={diaria}
            onChange={(event) => setDiaria(Number(event.target.value) || 0)}
            className="min-h-11 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
          />
        </label>
      </div>

      {!result.hasEnoughData ? (
        <p className="text-sm text-foreground/40">
          Ainda não há mensalistas/diaristas suficientes para calcular.
        </p>
      ) : result.isHealthy ? (
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            ✅ Preços atuais cobrem a despesa média projetada.
          </p>
          <p className="mt-1 text-xs text-foreground/50">
            Receita esperada {currency.format(result.currentExpectedRevenue)} ≥
            despesa média {currency.format(result.avgMonthlyExpenses)}.
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            ⚠️ Despesa média ({currency.format(result.avgMonthlyExpenses)}) supera
            a receita esperada ({currency.format(result.currentExpectedRevenue)}).
          </p>
          <p className="mt-2 text-xs text-foreground/60">
            Aumento sugerido de ~{Math.round((result.adjustmentFactor - 1) * 100)}%
            (mantém a proporção atual entre mensalidade e diária, arredondado
            para R$5):
          </p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <Suggestion label="Mensalidade" from={mensalidade} to={result.suggestedMensalidade} />
            <Suggestion label="Diária" from={diaria} to={result.suggestedDiaria} />
          </div>
        </div>
      )}
    </div>
  );
}

function Suggestion({ label, from, to }: { label: string; from: number; to: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-foreground/40">
        {label}
      </span>
      <span className="text-sm font-semibold">
        {currency.format(from)} →{" "}
        <span className="text-amber-700 dark:text-amber-400">
          {currency.format(to)}
        </span>
      </span>
    </div>
  );
}
