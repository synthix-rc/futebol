"use client";

import { useState, useTransition } from "react";
import { getSuggestedFillers, type SuggestedFiller } from "@/app/actions/match";

type PanelState =
  | { phase: "idle" }
  | { phase: "loaded"; candidates: SuggestedFiller[]; selectedIds: Set<string> }
  | { phase: "error"; message: string };

/**
 * "Sugerir Completar": fetches every tapa-buraco candidate available right
 * now (not just the number of open slots) and lets the admin tap names to
 * choose exactly who fills the gap, pre-checked with the top-ranked picks
 * as a convenient default. This matters in practice — a suggested player
 * can turn out to be hurt, tired, or already leaving, and the admin needs
 * to swap them for someone else on the spot rather than re-roll a fixed
 * batch. Shared between IncompleteQuadroCard (read-only preview further
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
      const result = await getSuggestedFillers(sessionId, excludePlayerIds);
      if (!result.success) {
        setState({ phase: "error", message: result.message });
        return;
      }
      setState({
        phase: "loaded",
        candidates: result.players,
        selectedIds: new Set(result.players.slice(0, neededCount).map((p) => p.id)),
      });
    });
  }

  function toggle(id: string) {
    setState((prev) => {
      if (prev.phase !== "loaded") return prev;
      const selectedIds = new Set(prev.selectedIds);
      if (selectedIds.has(id)) {
        selectedIds.delete(id);
      } else if (selectedIds.size < neededCount) {
        selectedIds.add(id);
      }
      return { ...prev, selectedIds };
    });
  }

  if (isPending) {
    return (
      <button
        type="button"
        disabled
        className="min-h-11 w-full rounded-md border border-dashed border-foreground/25 px-3 py-2.5 text-sm font-medium text-foreground/60 opacity-60"
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
        className="min-h-11 w-full rounded-md border border-dashed border-foreground/25 px-3 py-2.5 text-sm font-medium text-foreground/60 transition-colors hover:border-foreground/40 hover:bg-foreground/5"
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
          className="min-h-11 w-full rounded-md border border-dashed border-foreground/25 px-3 py-2.5 text-sm font-medium text-foreground/60 transition-colors hover:border-foreground/40 hover:bg-foreground/5"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const { candidates, selectedIds } = state;
  const canConfirm = selectedIds.size === neededCount;

  return (
    <div className="flex flex-col gap-2 rounded-md border border-foreground/15 bg-foreground/[0.03] p-3">
      <p className="text-[11px] font-medium text-foreground/60">
        Toque para escolher quem entra — mensalista e menos jogos hoje vêm
        pré-selecionados ({selectedIds.size}/{neededCount} selecionados):
      </p>
      {candidates.length === 0 ? (
        <p className="text-xs text-foreground/40">
          Ninguém disponível na fila para completar.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {candidates.map((player) => {
            const isSelected = selectedIds.has(player.id);
            const isDisabled = !isSelected && selectedIds.size >= neededCount;
            return (
              <li key={player.id}>
                <button
                  type="button"
                  disabled={isDisabled}
                  onClick={() => toggle(player.id)}
                  className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                    isSelected
                      ? "border-foreground bg-primary text-primary-foreground"
                      : isDisabled
                        ? "border-foreground/10 text-foreground/30"
                        : "border-foreground/15 hover:border-foreground/30 hover:bg-foreground/5"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true">{isSelected ? "✅" : "⬜"}</span>
                    {player.name}
                  </span>
                  <span className={isSelected ? "text-primary-foreground/70" : "text-foreground/40"}>
                    {player.type === "mensalista" ? "Mensalista" : "Diarista"} ·{" "}
                    {player.gamesPlayedToday} jogo
                    {player.gamesPlayedToday === 1 ? "" : "s"} hoje
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-col gap-2 pt-1 sm:flex-row">
        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => {
            onConfirm(candidates.filter((player) => selectedIds.has(player.id)));
            setState({ phase: "idle" });
          }}
          className="min-h-11 flex-1 rounded-md bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Confirmar
        </button>
        <button
          type="button"
          onClick={() => setState({ phase: "idle" })}
          className="min-h-11 flex-1 rounded-md border border-foreground/20 px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-foreground/5"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
