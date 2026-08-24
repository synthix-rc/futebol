"use client";

import { useState } from "react";
import { SumulaModal, type SumulaRosterEntry } from "./SumulaModal";
import type { WinnerTeam } from "@/types/supabase";

export function FinishMatchButtons({
  matchId,
  roster,
}: {
  matchId: string;
  roster: SumulaRosterEntry[];
}) {
  const [pendingResult, setPendingResult] = useState<WinnerTeam | null>(null);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={() => setPendingResult("team_a")}
          className="min-h-11 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
        >
          🏆 Time A Venceu
        </button>
        <button
          type="button"
          onClick={() => setPendingResult("draw")}
          className="min-h-11 w-full rounded-lg border border-foreground/20 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-foreground/5 sm:w-auto"
        >
          🤝 Empate
        </button>
        <button
          type="button"
          onClick={() => setPendingResult("team_b")}
          className="min-h-11 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
        >
          🏆 Time B Venceu
        </button>
      </div>

      {pendingResult && (
        <SumulaModal
          matchId={matchId}
          result={pendingResult}
          roster={roster}
          onClose={() => setPendingResult(null)}
        />
      )}
    </div>
  );
}
