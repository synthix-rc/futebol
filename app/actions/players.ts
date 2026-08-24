"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { PlayerType } from "@/types/supabase";

type ActionResult = { success: boolean; message?: string };

const RATING_MIN = 1;
const RATING_MAX = 5;

export type PlayerUpdateInput = {
  name: string;
  type: PlayerType;
  defRating: number;
  midRating: number;
  atkRating: number;
};

/** Ficha técnica edit: ratings and type from the admin's player roster. */
export async function updatePlayer(
  playerId: string,
  input: PlayerUpdateInput,
): Promise<ActionResult> {
  if (!playerId) {
    return { success: false, message: "Jogador inválido." };
  }
  if (!input.name.trim()) {
    return { success: false, message: "Nome é obrigatório." };
  }
  if (input.type !== "mensalista" && input.type !== "diarista") {
    return { success: false, message: "Tipo inválido." };
  }

  const ratings: [string, number][] = [
    ["Defesa", input.defRating],
    ["Meio", input.midRating],
    ["Ataque", input.atkRating],
  ];
  for (const [label, value] of ratings) {
    if (!Number.isInteger(value) || value < RATING_MIN || value > RATING_MAX) {
      return {
        success: false,
        message: `Nota de ${label} deve ser um número inteiro entre ${RATING_MIN} e ${RATING_MAX}.`,
      };
    }
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("players")
    .update({
      name: input.name.trim(),
      type: input.type,
      def_rating: input.defRating,
      mid_rating: input.midRating,
      atk_rating: input.atkRating,
    })
    .eq("id", playerId);

  if (error) {
    return { success: false, message: "Erro ao salvar jogador." };
  }

  revalidatePath("/admin/jogadores");
  return { success: true };
}
