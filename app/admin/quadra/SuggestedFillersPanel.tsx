"use client";

import { useState, useTransition } from "react";
import { getSuggestedFillers, type SuggestedFiller } from "@/app/actions/match";

type PanelState =
  | { phase: "idle" }
  | { phase: "loaded"; suggestions: SuggestedFiller[] }
  | { phase: "error"; message: string };

/**
 * "Sugerir Completar": fetches tapa-buraco candidates for a gap and lets
 * the admin confirm or cancel before anything is merged into the caller's
 * roster — shared between IncompleteQuadroCard (read-only preview further
 * back in the queue) and DraftBoard (where confirming actually feeds the
 * next match).
 */
export function SuggestedFillersPanel({
  sessionId,
  neededCount,
  excludePlayerIds,
  onConfirm,
}: {
  sessionId: string;
  neededCount: number;
  excludePlayerIds: string[];
  onConfirm: (players: SuggestedFiller[]) => void;
}) {
  const [state, setState] = useState<PanelState>({ phase: "idle" });
  const [isPending, startTransition] = useTransition();

  function handleFetch() {
    startTransition(async () => {
      const result = await getSuggestedFillers(sessionId, neededCount, excludePlayerIds);
      if (!result.success) {
        setState({ phase: "error", message: result.message });
        return;
      }
      setState({ phase: "loaded", suggestions: result.players });
    });
  }

  if (isPending) {
    return (
      <button
        type="button"
        disabled
        className="w-full rounded-md border border-dashed border-foreground/25 px-3 py-2 text-xs font-medium text-foreground/60 opacity-60"
      >
        Buscando sugestões…
      </button>
    );
  }

  if (state.phase === "idle") {
    return (
      <button
        type="button"
        onClick={handleFetch}
        className="w-full rounded-md border border-dashed border-foreground/25 px-3 py-2 text-xs font-medium text-foreground/60 transition-colors hover:border-foreground/40 hover:bg-foreground/5"
      >
        Sugerir Completar (+{neededCount} vaga{neededCount === 1 ? "" : "s"})
      </button>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-red-500">{state.message}</p>
        <button
          type="button"
          onClick={handleFetch}
          className="w-full rounded-md border border-dashed border-foreground/25 px-3 py-2 text-xs font-medium text-foreground/60 transition-colors hover:border-foreground/40 hover:bg-foreground/5"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-foreground/15 bg-foreground/[0.03] p-3">
      <p className="text-[11px] font-medium text-foreground/60">
        Sugestões (mensalista e menos jogos hoje têm prioridade):
      </p>
      {state.suggestions.length === 0 ? (
        <p className="text-xs text-foreground/40">
          Ninguém disponível na fila para completar.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {state.suggestions.map((player) => (
            <li
              key={player.id}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span>{player.name}</span>
              <span className="text-foreground/40">
                {player.type === "mensalista" ? "Mensalista" : "Diarista"} ·{" "}
                {player.gamesPlayedToday} jogo
                {player.gamesPlayedToday === 1 ? "" : "s"} hoje
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          disabled={state.suggestions.length === 0}
          onClick={() => {
            onConfirm(state.suggestions);
            setState({ phase: "idle" });
          }}
          className="flex-1 rounded-md bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Confirmar
        </button>
        <button
          type="button"
          onClick={() => setState({ phase: "idle" })}
          className="flex-1 rounded-md border border-foreground/20 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-foreground/5"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
