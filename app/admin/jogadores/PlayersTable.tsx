"use client";

import { useState, useTransition } from "react";
import { updatePlayer } from "@/app/actions/players";
import type { PlayerType } from "@/types/supabase";

export type PlayerRow = {
  id: string;
  name: string;
  type: PlayerType | null;
  defRating: number | null;
  midRating: number | null;
  atkRating: number | null;
  finishedGames: number;
};

export function PlayersTable({ players }: { players: PlayerRow[] }) {
  const [selected, setSelected] = useState<PlayerRow | null>(null);

  if (players.length === 0) {
    return (
      <p className="rounded-lg border border-foreground/10 px-4 py-6 text-center text-sm text-foreground/40">
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
          <li key={player.id}>
            <button
              type="button"
              onClick={() => setSelected(player)}
              className="flex min-h-11 w-full flex-col gap-2 rounded-lg border border-foreground/10 p-4 text-left transition-colors active:bg-foreground/5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{player.name}</span>
                <span className="whitespace-nowrap rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-medium text-foreground/60">
                  {player.type === "mensalista"
                    ? "Mensalista"
                    : player.type === "diarista"
                      ? "Diarista"
                      : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-foreground/50">
                <span className="font-mono">
                  D {player.defRating ?? "–"} · M {player.midRating ?? "–"} · A{" "}
                  {player.atkRating ?? "–"}
                </span>
                <span>
                  {player.finishedGames} jogo{player.finishedGames === 1 ? "" : "s"}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {/* Desktop: a plain table is fine — no small-screen constraint. */}
      <div className="hidden overflow-x-auto rounded-lg border border-foreground/10 sm:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-foreground/10 bg-foreground/[0.03] text-xs uppercase tracking-wide text-foreground/50">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">D / M / A</th>
              <th className="px-4 py-3 font-medium">Jogos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/10">
            {players.map((player) => (
              <tr
                key={player.id}
                onClick={() => setSelected(player)}
                className="cursor-pointer transition-colors hover:bg-foreground/5"
              >
                <td className="px-4 py-3 font-medium">{player.name}</td>
                <td className="px-4 py-3 text-foreground/60">
                  {player.type === "mensalista"
                    ? "Mensalista"
                    : player.type === "diarista"
                      ? "Diarista"
                      : "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-foreground/60">
                  {player.defRating ?? "–"} / {player.midRating ?? "–"} /{" "}
                  {player.atkRating ?? "–"}
                </td>
                <td className="px-4 py-3 text-foreground/60">
                  {player.finishedGames}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <PlayerSidepanel player={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

function PlayerSidepanel({
  player,
  onClose,
}: {
  player: PlayerRow;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(player.name);
  const [type, setType] = useState<PlayerType>(player.type ?? "diarista");
  const [defRating, setDefRating] = useState(player.defRating ?? 3);
  const [midRating, setMidRating] = useState(player.midRating ?? 3);
  const [atkRating, setAtkRating] = useState(player.atkRating ?? 3);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updatePlayer(player.id, {
        name,
        type,
        defRating,
        midRating,
        atkRating,
      });
      if (!result.success) {
        setError(result.message ?? "Erro ao salvar.");
        return;
      }
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col gap-6 overflow-y-auto bg-background p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{player.name}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-foreground/50 transition-colors hover:bg-foreground/5"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
            Ficha Técnica
          </h3>

          <label className="flex flex-col gap-1 text-sm">
            Nome
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="min-h-11 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Tipo
            <select
              value={type}
              onChange={(event) => setType(event.target.value as PlayerType)}
              className="min-h-11 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
            >
              <option value="mensalista">Mensalista</option>
              <option value="diarista">Diarista</option>
            </select>
          </label>

          <div className="flex flex-col gap-4">
            <RangeInput label="Defesa" value={defRating} onChange={setDefRating} />
            <RangeInput label="Meio" value={midRating} onChange={setMidRating} />
            <RangeInput label="Ataque" value={atkRating} onChange={setAtkRating} />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={isPending}
            className="min-h-11 rounded-md bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Salvando…" : "Salvar Alterações"}
          </button>
        </form>

        <div className="flex flex-col gap-2 border-t border-foreground/10 pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
            Histórico Financeiro
          </h3>
          <p className="rounded-md border border-dashed border-foreground/15 px-3 py-4 text-center text-xs text-foreground/40">
            Em breve — controle de mensalidades e pagamentos avulsos.
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-foreground/10 pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
            Histórico de Jogos
          </h3>
          <p className="text-sm">
            <span className="text-2xl font-bold">{player.finishedGames}</span>{" "}
            <span className="text-foreground/50">
              partida{player.finishedGames === 1 ? "" : "s"} finalizada
              {player.finishedGames === 1 ? "" : "s"}
            </span>
          </p>
          <p className="text-xs text-foreground/40">
            Estatística ao longo do tempo — não influencia o sorteio de
            tapa-buraco, que olha apenas quem jogou menos na sessão de hoje.
          </p>
        </div>
      </div>
    </div>
  );
}

function RangeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="flex items-center justify-between">
        {label}
        <span className="font-mono text-base font-semibold">{value}</span>
      </span>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 w-full accent-foreground"
      />
    </label>
  );
}
