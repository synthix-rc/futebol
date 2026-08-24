"use client";

import Link from "next/link";
import type { PlayerType } from "@/types/supabase";
import { PlayerAvatar } from "./PlayerAvatar";
import { PendingBadge, RatingSelect, TypeBadge } from "./PlayerRowShared";
import { useQuickEdit } from "./useQuickEdit";
import type { PlayerRow } from "./PlayersTable";

export function PlayerListCard({ player }: { player: PlayerRow }) {
  const edit = useQuickEdit(player);

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-foreground/10 bg-card p-4">
      <div className="flex items-center gap-3">
        <PlayerAvatar photoUrl={player.photoUrl} name={player.name} />
        <Link
          href={`/admin/jogadores/${player.id}`}
          className="flex flex-1 items-center gap-1 truncate font-medium"
        >
          <span className="truncate">{player.name}</span>
          {player.paidChurrascoThisMonth && (
            <span title="Pagou o churrasco este mês" aria-label="Pagou o churrasco este mês">
              🥩
            </span>
          )}
        </Link>
        {edit.isEditing ? (
          <button
            type="button"
            disabled={edit.isPending}
            onClick={edit.handleSave}
            className="min-h-9 shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {edit.isPending ? "Salvando…" : "Salvar"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => edit.setIsEditing(true)}
            aria-label="Editar"
            className="flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-md text-foreground/50 transition-colors hover:bg-foreground/5"
          >
            ✏️
          </button>
        )}
      </div>

      {edit.isEditing ? (
        <div className="flex flex-col gap-2">
          <select
            value={edit.type}
            onChange={(event) => edit.setType(event.target.value as PlayerType)}
            className="min-h-11 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
          >
            <option value="mensalista">Mensalista</option>
            <option value="diarista">Diarista</option>
          </select>
          <div className="flex justify-between gap-1">
            <RatingSelect label="D" value={edit.defRating} onChange={edit.setDefRating} />
            <RatingSelect label="M" value={edit.midRating} onChange={edit.setMidRating} />
            <RatingSelect label="A" value={edit.atkRating} onChange={edit.setAtkRating} />
            <RatingSelect label="V" value={edit.speedRating} onChange={edit.setSpeedRating} />
            <RatingSelect label="R" value={edit.staminaRating} onChange={edit.setStaminaRating} />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between text-xs text-foreground/50">
          <TypeBadge type={player.type} />
          <span className="font-mono">
            {`D${player.defRating ?? "–"} M${player.midRating ?? "–"} A${player.atkRating ?? "–"} V${player.speedRating ?? "–"} R${player.staminaRating ?? "–"}`}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-foreground/50">
        <span>
          {player.finishedGames} jogo{player.finishedGames === 1 ? "" : "s"}
        </span>
        {player.status === "pending" && <PendingBadge />}
      </div>

      {edit.error && <p className="text-xs text-red-500">{edit.error}</p>}
    </li>
  );
}
