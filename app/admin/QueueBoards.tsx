import type { QueueEntry, QueuePlayer } from "@/utils/queue";

const QUADRO_SIZE = 6;

/**
 * Groups the waiting queue into "Quadros" (lineups of 6, in arrival order)
 * instead of one long flat list, so the crowd on the sideline can see which
 * group of 6 plays next, then next, and so on.
 *
 * Purely presentational — no interactivity, so this stays a Server
 * Component. `startingQuadroNumber` lets the caller account for the two
 * lineups already on the field (Quadro 1 and 2) when a match is in
 * progress; it defaults to 1 for when the field is empty.
 */
export function QueueBoards({
  queue,
  startingQuadroNumber = 1,
}: {
  queue: QueueEntry[];
  startingQuadroNumber?: number;
}) {
  if (queue.length === 0) {
    return (
      <p className="text-sm text-foreground/40">
        Ninguém disponível na fila no momento.
      </p>
    );
  }

  const quadros = chunk(queue, QUADRO_SIZE);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {quadros.map((players, index) => (
        <QuadroCard
          key={players[0]?.presenceId ?? index}
          number={startingQuadroNumber + index}
          players={players}
        />
      ))}
    </div>
  );
}

function QuadroCard({
  number,
  players,
}: {
  number: number;
  players: QueueEntry[];
}) {
  const missing = QUADRO_SIZE - players.length;
  const ratings = sumRatings(players.map((entry) => entry.player));

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-foreground/10 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Quadro {number}</h3>
        {missing > 0 ? (
          <span className="whitespace-nowrap rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
            Incompleto · Faltam {missing}
          </span>
        ) : (
          <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-medium text-foreground/50">
            Completo
          </span>
        )}
      </div>

      <ul className="flex flex-col gap-1 text-sm">
        {players.map((entry) => (
          <li
            key={entry.presenceId}
            className="flex items-center justify-between gap-2"
          >
            <span>{entry.player.name}</span>
            <span className="font-mono text-[10px] text-foreground/40">
              {new Date(entry.checkInTimestamp).toLocaleTimeString("pt-BR")}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-auto border-t border-foreground/10 pt-2 font-mono text-xs text-foreground/50">
        DEF {ratings.def} · MID {ratings.mid} · ATK {ratings.atk}
      </p>
    </div>
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function sumRatings(players: QueuePlayer[]) {
  return players.reduce(
    (totals, player) => ({
      def: totals.def + (player.defRating ?? 0),
      mid: totals.mid + (player.midRating ?? 0),
      atk: totals.atk + (player.atkRating ?? 0),
    }),
    { def: 0, mid: 0, atk: 0 },
  );
}
