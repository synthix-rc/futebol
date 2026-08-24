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

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-foreground/10">
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
            {players.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-foreground/40">
                  Nenhum jogador cadastrado.
                </td>
              </tr>
            ) : (
              players.map((player) => (
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
              ))
            )}
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
            className="rounded-md p-1 text-foreground/50 transition-colors hover:bg-foreground/5"
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
              className="rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Tipo
            <select
              value={type}
              onChange={(event) => setType(event.target.value as PlayerType)}
              className="rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
            >
              <option value="mensalista">Mensalista</option>
              <option value="diarista">Diarista</option>
            </select>
          </label>

          <div className="grid grid-cols-3 gap-3">
            <RatingInput label="Defesa" value={defRating} onChange={setDefRating} />
            <RatingInput label="Meio" value={midRating} onChange={setMidRating} />
            <RatingInput label="Ataque" value={atkRating} onChange={setAtkRating} />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
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
        </div>
      </div>
    </div>
  );
}

function RatingInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      {label}
      <input
        type="number"
        min={1}
        max={5}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="rounded-md border border-foreground/20 bg-background px-2 py-1.5 text-sm"
      />
    </label>
  );
}
