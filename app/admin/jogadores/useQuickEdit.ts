"use client";

import { useState, useTransition } from "react";
import { updateQuickEdit } from "@/app/actions/players";
import type { PlayerStatus, PlayerType } from "@/types/supabase";

export type QuickEditablePlayer = {
  id: string;
  type: PlayerType | null;
  status: PlayerStatus;
  defRating: number | null;
  midRating: number | null;
  atkRating: number | null;
  speedRating: number | null;
  staminaRating: number | null;
};

/** Shared edit-mode state/logic behind the Jogadores list's inline "✏️
 * Editar" row — used by both the desktop <tr> and mobile <li> renderings
 * (two separate component instances, not one shared instance, since a
 * <tr> and <li> can't coexist as one component's output without breaking
 * table/list HTML structure; each just calls this hook independently). */
export function useQuickEdit(player: QuickEditablePlayer) {
  const [isEditing, setIsEditing] = useState(false);
  const [type, setType] = useState<PlayerType>(player.type ?? "diarista");
  const [status, setStatus] = useState<PlayerStatus>(player.status);
  const [defRating, setDefRating] = useState(player.defRating ?? 3);
  const [midRating, setMidRating] = useState(player.midRating ?? 3);
  const [atkRating, setAtkRating] = useState(player.atkRating ?? 3);
  const [speedRating, setSpeedRating] = useState(player.speedRating ?? 3);
  const [staminaRating, setStaminaRating] = useState(player.staminaRating ?? 3);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateQuickEdit(player.id, {
        type,
        status,
        defRating,
        midRating,
        atkRating,
        speedRating,
        staminaRating,
      });
      if (!result.success) {
        setError(result.message ?? "Erro ao salvar.");
        return;
      }
      setIsEditing(false);
    });
  }

  return {
    isEditing,
    setIsEditing,
    type,
    setType,
    status,
    setStatus,
    defRating,
    setDefRating,
    midRating,
    setMidRating,
    atkRating,
    setAtkRating,
    speedRating,
    setSpeedRating,
    staminaRating,
    setStaminaRating,
    isPending,
    error,
    handleSave,
  };
}
