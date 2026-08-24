"use client";

import { useState, useTransition } from "react";
import { finishMatch } from "@/app/actions/match";
import type { WinnerTeam } from "@/types/supabase";

export function FinishMatchButtons({ matchId }: { matchId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(result: WinnerTeam) {
    setError(null);
    startTransition(async () => {
      const outcome = await finishMatch(matchId, result);
      if (!outcome.success) {
        setError(outcome.message ?? "Erro ao registrar o resultado.");
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => submit("team_a")}
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          🏆 Time A Venceu
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => submit("draw")}
          className="rounded-lg border border-foreground/20 px-4 py-2 text-sm font-semibold transition-colors hover:bg-foreground/5 disabled:opacity-50"
        >
          🤝 Empate
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => submit("team_b")}
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          🏆 Time B Venceu
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
