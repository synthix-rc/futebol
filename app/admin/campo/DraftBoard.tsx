"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { startFirstMatch, type SuggestedFiller } from "@/app/actions/match";
import type { QueuePlayer } from "@/utils/queue";
import { SuggestedFillersPanel } from "./SuggestedFillersPanel";

const TEAM_SIZE = 6;

type TeamId = "A" | "B";
type Teams = Record<TeamId, string[]>;

/**
 * "Modo Deus": lets the admin manually rebalance the next match's two teams
 * (e.g. the FIFO draw stacked 5 defenders on one side) before starting it.
 * Who is *eligible* to play is still entirely FIFO-driven — `players` is
 * the fixed pool the parent handed down (the next N in the queue); this
 * board only lets the admin drag people between Team A and Team B within
 * that pool, never pull in anyone from outside it.
 */
export function DraftBoard({
  sessionId,
  players,
}: {
  sessionId: string;
  players: QueuePlayer[];
}) {
  // Seeded from the prop, then extended locally when the admin accepts
  // tapa-buraco suggestions to fill a shortfall (see handleFillersConfirmed).
  const [poolPlayers, setPoolPlayers] = useState<QueuePlayer[]>(players);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());

  const playersById = useMemo(
    () => new Map(poolPlayers.map((player) => [player.id, player])),
    [poolPlayers],
  );

  const [teams, setTeams] = useState<Teams>(() => ({
    A: players.slice(0, TEAM_SIZE).map((p) => p.id),
    B: players.slice(TEAM_SIZE, TEAM_SIZE * 2).map((p) => p.id),
  }));
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Mouse and touch are deliberately separate sensors, not one PointerSensor
  // covering both: on a phone, the default browser behavior for a
  // finger-down-and-move is to scroll the page, and that needs to keep
  // working for a normal swipe. TouchSensor's delay+tolerance means a drag
  // only activates after a 250ms press-and-hold that doesn't wander more
  // than 5px — a quick swipe over a card falls through to native scroll
  // instead of hijacking it. Mouse keeps the snappier distance-based
  // activation, since there's no scroll-gesture conflict to guard against.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const readyToStart =
    teams.A.length === TEAM_SIZE && teams.B.length === TEAM_SIZE;

  function teamOf(playerId: string): TeamId | null {
    if (teams.A.includes(playerId)) return "A";
    if (teams.B.includes(playerId)) return "B";
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActivePlayerId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTeam = teamOf(activeId);
    const overTeam: TeamId | null =
      overId === "A" || overId === "B" ? overId : teamOf(overId);

    if (!activeTeam || !overTeam || activeTeam === overTeam) return;

    setTeams((prev) => {
      const source = prev[activeTeam].filter((id) => id !== activeId);
      const target = [...prev[overTeam]];
      const overIndex = target.indexOf(overId);
      target.splice(overIndex >= 0 ? overIndex : target.length, 0, activeId);
      return { ...prev, [activeTeam]: source, [overTeam]: target };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    setActivePlayerId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const team = teamOf(activeId);
    if (!team) return;

    const items = teams[team];
    const oldIndex = items.indexOf(activeId);
    const newIndex = items.indexOf(overId);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    setTeams((prev) => ({
      ...prev,
      [team]: arrayMove(prev[team], oldIndex, newIndex),
    }));
  }

  function handleStart() {
    setError(null);
    startTransition(async () => {
      const result = await startFirstMatch(
        sessionId,
        teams.A,
        teams.B,
        Array.from(completingIds),
      );
      if (!result.success) {
        setError(result.message ?? "Erro ao iniciar a partida.");
      }
    });
  }

  // Tapa-buraco: merges confirmed fillers into the pool and drops them into
  // whichever team currently has fewer members, so the admin can still drag
  // them around afterward like anyone else.
  function handleFillersConfirmed(fillers: SuggestedFiller[]) {
    setPoolPlayers((prev) => [...prev, ...fillers]);
    setCompletingIds((prev) => {
      const next = new Set(prev);
      for (const filler of fillers) next.add(filler.id);
      return next;
    });
    setTeams((prev) => {
      const next: Teams = { A: [...prev.A], B: [...prev.B] };
      for (const filler of fillers) {
        const target = next.A.length <= next.B.length ? "A" : "B";
        const side = next[target].length < TEAM_SIZE ? target : target === "A" ? "B" : "A";
        next[side].push(filler.id);
      }
      return next;
    });
  }

  const activePlayer = activePlayerId ? (playersById.get(activePlayerId) ?? null) : null;
  const shortfall = TEAM_SIZE * 2 - poolPlayers.length;

  if (players.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-foreground/40">
        Nenhum jogador na fila ainda.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TeamColumn
            teamId="A"
            label="Time A"
            playerIds={teams.A}
            playersById={playersById}
            completingIds={completingIds}
          />
          <TeamColumn
            teamId="B"
            label="Time B"
            playerIds={teams.B}
            playersById={playersById}
            completingIds={completingIds}
          />
        </div>
        <DragOverlay>
          {activePlayer ? (
            <PlayerCard
              player={activePlayer}
              isCompleting={completingIds.has(activePlayer.id)}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {shortfall > 0 && (
        <SuggestedFillersPanel
          sessionId={sessionId}
          neededCount={shortfall}
          excludePlayerIds={poolPlayers.map((player) => player.id)}
          onConfirm={handleFillersConfirmed}
        />
      )}

      <div className="flex w-full flex-col items-center gap-2 pt-2 sm:w-auto">
        <button
          type="button"
          disabled={isPending || !readyToStart}
          onClick={handleStart}
          className="min-h-11 w-full rounded-lg bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40 sm:w-auto"
        >
          {isPending ? "Iniciando…" : "Iniciar Partida"}
        </button>
        <p className="text-xs text-foreground/50">
          {readyToStart
            ? "Confira os times e arraste para ajustar antes de começar."
            : shortfall > 0
              ? `Faltam ${shortfall} jogador${shortfall === 1 ? "" : "es"} na fila — use "Sugerir Completar" acima ou espere mais check-ins.`
              : `Time A: ${teams.A.length}/${TEAM_SIZE} · Time B: ${teams.B.length}/${TEAM_SIZE}`}
        </p>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}

function TeamColumn({
  teamId,
  label,
  playerIds,
  playersById,
  completingIds,
}: {
  teamId: TeamId;
  label: string;
  playerIds: string[];
  playersById: Map<string, QueuePlayer>;
  completingIds: Set<string>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: teamId });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-2 rounded-md border p-3 transition-colors ${
        isOver ? "border-foreground/40 bg-foreground/5" : "border-foreground/10"
      }`}
    >
      <h3 className="mb-1 flex items-center justify-between text-sm font-semibold">
        {label}
        <span className="font-mono text-xs font-normal text-foreground/40">
          {playerIds.length}/{TEAM_SIZE}
        </span>
      </h3>
      <SortableContext items={playerIds} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-12 flex-col gap-2">
          {playerIds.length === 0 ? (
            <p className="rounded-md border border-dashed border-foreground/15 px-3 py-4 text-center text-xs text-foreground/30">
              Arraste um jogador aqui
            </p>
          ) : (
            playerIds.map((id) => {
              const player = playersById.get(id);
              return player ? (
                <SortablePlayerCard
                  key={id}
                  player={player}
                  isCompleting={completingIds.has(id)}
                />
              ) : null;
            })
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortablePlayerCard({
  player,
  isCompleting,
}: {
  player: QueuePlayer;
  isCompleting: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: player.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex min-h-11 touch-none cursor-grab select-none items-center rounded-md border border-foreground/10 bg-background px-3 py-2.5 text-sm transition-shadow active:cursor-grabbing ${
        isDragging ? "opacity-30" : "hover:border-foreground/30 hover:shadow-sm"
      }`}
    >
      <PlayerCardContent player={player} isCompleting={isCompleting} />
    </div>
  );
}

function PlayerCard({
  player,
  isCompleting,
}: {
  player: QueuePlayer;
  isCompleting: boolean;
}) {
  return (
    <div className="flex min-h-11 cursor-grabbing items-center rounded-md border border-foreground/20 bg-background px-3 py-2.5 text-sm shadow-lg">
      <PlayerCardContent player={player} isCompleting={isCompleting} />
    </div>
  );
}

function PlayerCardContent({
  player,
  isCompleting,
}: {
  player: QueuePlayer;
  isCompleting: boolean;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <div>
        <p className="flex items-center gap-1.5 font-medium">
          {player.name}
          {isCompleting && (
            <span className="whitespace-nowrap rounded-full bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-medium text-sky-600 dark:text-sky-400">
              Tapa-Buraco
            </span>
          )}
        </p>
        <p className="text-[10px] text-foreground/40">
          {player.type === "mensalista" ? "Mensalista" : "Diarista"}
        </p>
      </div>
      <span className="font-mono text-[10px] text-foreground/40">
        {`D${player.defRating ?? "–"} M${player.midRating ?? "–"} A${player.atkRating ?? "–"} V${player.speedRating ?? "–"} R${player.staminaRating ?? "–"}`}
      </span>
    </div>
  );
}
