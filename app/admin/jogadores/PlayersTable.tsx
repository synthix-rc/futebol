import type { PlayerStatus, PlayerType } from "@/types/supabase";
import { PlayerListCard } from "./PlayerListCard";
import { PlayerTableRow } from "./PlayerTableRow";

export type PlayerRow = {
  id: string;
  name: string;
  type: PlayerType | null;
  status: PlayerStatus;
  photoUrl: string | null;
  defRating: number | null;
  midRating: number | null;
  atkRating: number | null;
  speedRating: number | null;
  staminaRating: number | null;
  finishedGames: number;
  /** BBQ Module — true when a 'churrasco' category payment ('pago') exists
   * for this player in the current reference month. */
  paidChurrascoThisMonth: boolean;
};

/**
 * Server Component orchestrator — the actual per-row interactivity (inline
 * "✏️ Editar" toggling type + the 5 scouting metrics without leaving the
 * page) lives in PlayerTableRow (desktop) / PlayerListCard (mobile), two
 * separate Client Components rather than one shared instance: a `<tr>`
 * and `<li>` can't both be one component's output without breaking valid
 * table/list HTML, so each renders and edits independently (see
 * useQuickEdit.ts for the shared logic behind both).
 */
export function PlayersTable({ players }: { players: PlayerRow[] }) {
  if (players.length === 0) {
    return (
      <p className="rounded-lg border border-foreground/10 bg-card px-4 py-6 text-center text-sm text-foreground/40">
        Nenhum jogador cadastrado.
      </p>
    );
  }

  return (
    <>
      {/* Mobile: card list — a <table> forces horizontal scroll on narrow
          screens, which is exactly what this app needs to avoid (99% of
          usage is on a phone at the sideline). */}
      <ul className="flex flex-col gap-3 sm:hidden">
        {players.map((player) => (
          <PlayerListCard key={player.id} player={player} />
        ))}
      </ul>

      {/* Desktop: a plain table is fine — no small-screen constraint. */}
      <div className="hidden overflow-x-auto rounded-lg border border-foreground/10 bg-card sm:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-foreground/10 bg-foreground/[0.03] text-xs uppercase tracking-wide text-foreground/50">
            <tr>
              <th className="px-4 py-3 font-medium">Jogador</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">D / M / A / V / R</th>
              <th className="px-4 py-3 font-medium">Jogos</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/10">
            {players.map((player) => (
              <PlayerTableRow key={player.id} player={player} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
