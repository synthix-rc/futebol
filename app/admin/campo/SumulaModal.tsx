"use client";

import { useState, useTransition } from "react";
import { finishMatch, type MatchPlayerStat } from "@/app/actions/match";
import type { MatchTeam, WinnerTeam } from "@/types/supabase";

export type SumulaRosterEntry = {
  playerId: string;
  name: string;
  team: MatchTeam;
};

type StatState = Record<string, { goals: number; assists: number }>;

/**
 * "Súmula" — collected right when the admin picks a match result, before
 * the queue actually rotates. Confirming a result opens this instead of
 * finishing the match immediately, so goals/assists get attributed to the
 * right players while everyone's still on the field and it's fresh.
 */
export function SumulaModal({
  matchId,
  result,
  roster,
  onClose,
}: {
  matchId: string;
  result: WinnerTeam;
  roster: SumulaRosterEntry[];
  onClose: () => void;
}) {
  const [stats, setStats] = useState<StatState>(() =>
    Object.fromEntries(roster.map((entry) => [entry.playerId, { goals: 0, assists: 0 }])),
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function bump(playerId: string, field: "goals" | "assists", delta: number) {
    setStats((prev) => {
      const current = prev[playerId] ?? { goals: 0, assists: 0 };
      const next = Math.max(0, current[field] + delta);
      return { ...prev, [playerId]: { ...current, [field]: next } };
    });
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const playerStats: MatchPlayerStat[] = roster.map((entry) => ({
        playerId: entry.playerId,
        goals: stats[entry.playerId]?.goals ?? 0,
        assists: stats[entry.playerId]?.assists ?? 0,
      }));

      const outcome = await finishMatch(matchId, result, playerStats);
      if (!outcome.success) {
        setError(outcome.message ?? "Erro ao salvar a súmula.");
        return;
      }
      onClose();
    });
  }

  const teamAEntries = roster.filter((entry) => entry.team === "A");
  const teamBEntries = roster.filter((entry) => entry.team === "B");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-6">
      <div className="flex max-h-[90vh] w-full flex-col gap-4 rounded-t-2xl bg-card p-6 shadow-xl sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">📋 Súmula da Partida</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex min-h-9 min-w-9 items-center justify-center rounded-md text-foreground/50 transition-colors hover:bg-foreground/5"
          >
            ✕
          </button>
        </div>
        <p className="text-xs text-foreground/50">
          Registre gols e assistências antes de rolar a fila. Pode deixar tudo zerado se
          preferir não registrar.
        </p>

        <div className="flex flex-col gap-4 overflow-y-auto">
          <TeamStatList entries={teamAEntries} stats={stats} bump={bump} />
          <TeamStatList entries={teamBEntries} stats={stats} bump={bump} />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={handleSave}
            className="min-h-11 flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Salvando…" : "Salvar Súmula e Rolar Fila"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={onClose}
            className="min-h-11 rounded-md border border-foreground/20 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-foreground/5 disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function TeamStatList({
  entries,
  stats,
  bump,
}: {
  entries: SumulaRosterEntry[];
  stats: StatState;
  bump: (playerId: string, field: "goals" | "assists", delta: number) => void;
}) {
  if (entries.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2">
      {entries.map((entry) => {
        const playerStats = stats[entry.playerId] ?? { goals: 0, assists: 0 };
        return (
          <li
            key={entry.playerId}
            className="flex flex-col gap-2 rounded-lg border border-foreground/10 bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="truncate text-sm font-medium">{entry.name}</span>
            <div className="flex gap-4">
              <Counter
                label="⚽ Gols"
                value={playerStats.goals}
                onDecrement={() => bump(entry.playerId, "goals", -1)}
                onIncrement={() => bump(entry.playerId, "goals", 1)}
              />
              <Counter
                label="🎯 Assist."
                value={playerStats.assists}
                onDecrement={() => bump(entry.playerId, "assists", -1)}
                onIncrement={() => bump(entry.playerId, "assists", 1)}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Counter({
  label,
  value,
  onDecrement,
  onIncrement,
}: {
  label: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-14 text-[10px] uppercase tracking-wide text-foreground/40">
        {label}
      </span>
      <button
        type="button"
        onClick={onDecrement}
        aria-label={`Diminuir ${label}`}
        className="flex min-h-8 min-w-8 items-center justify-center rounded-md border border-foreground/20 text-sm font-semibold transition-colors hover:bg-foreground/5"
      >
        −
      </button>
      <span className="w-4 text-center font-mono text-sm font-semibold">{value}</span>
      <button
        type="button"
        onClick={onIncrement}
        aria-label={`Aumentar ${label}`}
        className="flex min-h-8 min-w-8 items-center justify-center rounded-md border border-foreground/20 text-sm font-semibold transition-colors hover:bg-foreground/5"
      >
        +
      </button>
    </div>
  );
}
