"use client";

import { useState } from "react";
import { sumRatings, type QueueEntry, type QueuePlayer } from "@/utils/queue";
import type { SuggestedFiller } from "@/app/actions/match";
import { GamesPlayedBadge } from "./GamesPlayedBadge";
import { SuggestedFillersPanel } from "./SuggestedFillersPanel";

const QUADRO_SIZE = 6;

/**
 * The interactive twin of QueueBoards' plain QuadroCard, used only for
 * incomplete groups: lets the admin pull tapa-buraco suggestions in to
 * preview a completed lineup. This never writes to the database — it's a
 * client-local merge for visibility. Real, actionable completion (feeding a
 * match that's about to start) happens in DraftBoard, which owns the
 * `startFirstMatch` submission and the `is_completing` bookkeeping.
 */
export function IncompleteQuadroCard({
  sessionId,
  number,
  players,
}: {
  sessionId: string;
  number: number;
  players: QueueEntry[];
}) {
  const [fillers, setFillers] = useState<SuggestedFiller[]>([]);

  const roster: {
    id: string;
    name: string;
    player: QueuePlayer;
    isFiller: boolean;
    checkInTimestamp: string | null;
    gamesPlayedToday: number;
  }[] = [
    ...players.map((entry) => ({
      id: entry.presenceId,
      name: entry.player.name,
      player: entry.player,
      isFiller: false,
      checkInTimestamp: entry.checkInTimestamp,
      gamesPlayedToday: entry.gamesPlayedToday,
    })),
    ...fillers.map((filler) => ({
      id: filler.id,
      name: filler.name,
      player: filler,
      isFiller: true,
      checkInTimestamp: null,
      gamesPlayedToday: filler.gamesPlayedToday,
    })),
  ];

  const missing = QUADRO_SIZE - roster.length;
  const ratings = sumRatings(roster.map((entry) => entry.player));
  const excludeIds = [
    ...players.map((entry) => entry.playerId),
    ...fillers.map((filler) => filler.id),
  ];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-foreground/10 bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Quadro {number}</h3>
        {missing > 0 ? (
          <span className="whitespace-nowrap rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
            Incompleto · Faltam {missing}
          </span>
        ) : (
          <span className="whitespace-nowrap rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            Completo com tapa-buraco
          </span>
        )}
      </div>

      <ul className="flex flex-col gap-1 text-sm">
        {roster.map((entry) => (
          <li
            key={entry.id}
            className="flex items-center justify-between gap-2"
          >
            <span className="flex items-center gap-1.5">
              {entry.name}
              {entry.isFiller && (
                <span className="whitespace-nowrap rounded-full bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-medium text-sky-600 dark:text-sky-400">
                  Tapa-Buraco
                </span>
              )}
            </span>
            <span className="flex items-center gap-1.5">
              <GamesPlayedBadge count={entry.gamesPlayedToday} />
              <span className="font-mono text-[10px] text-foreground/40">
                {entry.checkInTimestamp
                  ? new Date(entry.checkInTimestamp).toLocaleTimeString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                    })
                  : "sugerido"}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <p className="border-t border-foreground/10 pt-2 font-mono text-xs text-foreground/50">
        DEF {ratings.def} · MID {ratings.mid} · ATK {ratings.atk} · VEL {ratings.speed} · RES{" "}
        {ratings.stamina}
      </p>

      {missing > 0 && (
        <SuggestedFillersPanel
          sessionId={sessionId}
          neededCount={missing}
          excludePlayerIds={excludeIds}
          onConfirm={(suggested) => setFillers((prev) => [...prev, ...suggested])}
        />
      )}
    </div>
  );
}
