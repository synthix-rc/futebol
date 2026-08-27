/**
 * Discreet "⚽ N" indicator for how many matches a player has played today
 * (session-scoped `games_played_today`, see utils/queue.ts), shown next to
 * their name/check-in time in the queue boards — the same number that
 * drives Regra 1's priority ordering and the tapa-buraco ranking, made
 * visible so the admin can sanity-check who's actually played least.
 *
 * No "use client" here — this is a plain presentational function, safe to
 * render from both a Server Component (QueueBoards' QuadroCard) and a
 * Client Component (IncompleteQuadroCard) without needing its own directive.
 */
export function GamesPlayedBadge({ count }: { count: number }) {
  return (
    <span
      title="Partidas jogadas hoje"
      className="whitespace-nowrap rounded-full bg-foreground/10 px-1.5 py-0.5 font-mono text-[10px] text-foreground/50"
    >
      ⚽ {count}
    </span>
  );
}
