"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
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
import { startFirstMatch } from "@/app/actions/match";
import type { QueuePlayer } from "@/utils/queue";

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
export function DraftBoard({ players }: { players: QueuePlayer[] }) {
  const playersById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );

  const [teams, setTeams] = useState<Teams>(() => ({
    A: players.slice(0, TEAM_SIZE).map((p) => p.id),
    B: players.slice(TEAM_SIZE, TEAM_SIZE * 2).map((p) => p.id),
  }));
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
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
      const result = await startFirstMatch(teams.A, teams.B);
      if (!result.success) {
        setError(result.message ?? "Erro ao iniciar a partida.");
      }
    });
  }

  const activePlayer = activePlayerId ? (playersById.get(activePlayerId) ?? null) : null;

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
          />
          <TeamColumn
            teamId="B"
            label="Time B"
            playerIds={teams.B}
            playersById={playersById}
          />
        </div>
        <DragOverlay>
          {activePlayer ? <PlayerCard player={activePlayer} /> : null}
        </DragOverlay>
      </DndContext>

      <div className="flex flex-col items-center gap-2 pt-2">
        <button
          type="button"
          disabled={isPending || !readyToStart}
          onClick={handleStart}
          className="rounded-lg bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {isPending ? "Iniciando…" : "Iniciar Partida"}
        </button>
        <p className="text-xs text-foreground/50">
          {readyToStart
            ? "Confira os times e arraste para ajustar antes de começar."
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
}: {
  teamId: TeamId;
  label: string;
  playerIds: string[];
  playersById: Map<string, QueuePlayer>;
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
                <SortablePlayerCard key={id} player={player} />
              ) : null;
            })
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortablePlayerCard({ player }: { player: QueuePlayer }) {
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
      className={`touch-none cursor-grab select-none rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm transition-shadow active:cursor-grabbing ${
        isDragging ? "opacity-30" : "hover:border-foreground/30 hover:shadow-sm"
      }`}
    >
      <PlayerCardContent player={player} />
    </div>
  );
}

function PlayerCard({ player }: { player: QueuePlayer }) {
  return (
    <div className="cursor-grabbing rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm shadow-lg">
      <PlayerCardContent player={player} />
    </div>
  );
}

function PlayerCardContent({ player }: { player: QueuePlayer }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="font-medium">{player.name}</p>
        <p className="text-[10px] text-foreground/40">
          {player.type === "mensalista" ? "Mensalista" : "Diarista"}
        </p>
      </div>
      <span className="font-mono text-[10px] text-foreground/40">
        D{player.defRating ?? "–"} M{player.midRating ?? "–"} A{player.atkRating ?? "–"}
      </span>
    </div>
  );
}
