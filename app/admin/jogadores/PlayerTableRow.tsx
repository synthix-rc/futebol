"use client";

import Link from "next/link";
import type { PlayerType } from "@/types/supabase";
import { PlayerAvatar } from "./PlayerAvatar";
import { PendingBadge, RatingSelect, TypeBadge } from "./PlayerRowShared";
import { useQuickEdit } from "./useQuickEdit";
import type { PlayerRow } from "./PlayersTable";

export function PlayerTableRow({ player }: { player: PlayerRow }) {
  const edit = useQuickEdit(player);

  return (
    <tr className="transition-colors hover:bg-foreground/5">
      <td className="px-0 py-0">
        <Link
          href={`/admin/jogadores/${player.id}`}
          className="flex items-center gap-3 px-4 py-3 font-medium"
        >
          <PlayerAvatar photoUrl={player.photoUrl} name={player.name} />
          {player.name}
          {player.paidChurrascoThisMonth && (
            <span title="Pagou o churrasco este mês" aria-label="Pagou o churrasco este mês">
              🥩
            </span>
          )}
        </Link>
      </td>
      <td className="px-4 py-3">
        {edit.isEditing ? (
          <select
            value={edit.type}
            onChange={(event) => edit.setType(event.target.value as PlayerType)}
            className="min-h-9 rounded-md border border-foreground/20 bg-background px-2 py-1 text-xs"
          >
            <option value="mensalista">Mensalista</option>
            <option value="diarista">Diarista</option>
          </select>
        ) : (
          <TypeBadge type={player.type} />
        )}
      </td>
      <td className="px-4 py-3">
        {edit.isEditing ? (
          <div className="flex gap-1">
            <RatingSelect label="D" value={edit.defRating} onChange={edit.setDefRating} />
            <RatingSelect label="M" value={edit.midRating} onChange={edit.setMidRating} />
            <RatingSelect label="A" value={edit.atkRating} onChange={edit.setAtkRating} />
            <RatingSelect label="V" value={edit.speedRating} onChange={edit.setSpeedRating} />
            <RatingSelect label="R" value={edit.staminaRating} onChange={edit.setStaminaRating} />
          </div>
        ) : (
          <span className="font-mono text-xs text-foreground/60">
            {player.defRating ?? "–"} / {player.midRating ?? "–"} / {player.atkRating ?? "–"} /{" "}
            {player.speedRating ?? "–"} / {player.staminaRating ?? "–"}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-foreground/60">{player.finishedGames}</td>
      <td className="px-4 py-3">{player.status === "pending" ? <PendingBadge /> : null}</td>
      <td className="px-4 py-3">
        <div className="flex flex-col items-start gap-1">
          {edit.isEditing ? (
            <button
              type="button"
              disabled={edit.isPending}
              onClick={edit.handleSave}
              className="min-h-9 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {edit.isPending ? "Salvando…" : "Salvar"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => edit.setIsEditing(true)}
              aria-label="Editar"
              className="flex min-h-9 min-w-9 items-center justify-center rounded-md text-foreground/50 transition-colors hover:bg-foreground/5"
            >
              ✏️
            </button>
          )}
          {edit.error && <p className="text-xs text-red-500">{edit.error}</p>}
        </div>
      </td>
    </tr>
  );
}
