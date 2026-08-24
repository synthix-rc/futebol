"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { PaymentType } from "@/types/supabase";

type ActionResult = { success: boolean; message?: string };

export type RegisterPaymentInput = {
  playerId: string;
  /** Required for `diaria` (which session it covers), null for `mensalidade`
   * (a monthly fee isn't tied to a specific day's session). */
  sessionId: string | null;
  amount: number;
  type: PaymentType;
  /** 'YYYY-MM' */
  referenceMonth: string;
};

const REFERENCE_MONTH_PATTERN = /^\d{4}-\d{2}$/;

/**
 * "Marcar Pago": records a payment as paid. Guards against double-marking
 * the same (player, type, period[, session for diária]) combo — there's no
 * separate "create pending" step in this UI, so a paid row simply doesn't
 * exist until this is called.
 */
export async function registerPayment(
  input: RegisterPaymentInput,
): Promise<ActionResult> {
  if (!input.playerId) {
    return { success: false, message: "Jogador inválido." };
  }
  if (input.type !== "mensalidade" && input.type !== "diaria") {
    return { success: false, message: "Tipo de pagamento inválido." };
  }
  if (input.type === "diaria" && !input.sessionId) {
    return { success: false, message: "Sessão inválida para diária." };
  }
  if (!REFERENCE_MONTH_PATTERN.test(input.referenceMonth)) {
    return { success: false, message: "Mês de referência inválido." };
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { success: false, message: "Informe um valor válido." };
  }

  const supabase = await createClient();

  let existingQuery = supabase
    .from("payments")
    .select("id")
    .eq("player_id", input.playerId)
    .eq("type", input.type)
    .eq("reference_month", input.referenceMonth)
    .eq("status", "pago");

  existingQuery =
    input.type === "diaria"
      ? existingQuery.eq("session_id", input.sessionId)
      : existingQuery.is("session_id", null);

  const { data: existing, error: existingError } = await existingQuery.maybeSingle();

  if (existingError) {
    return { success: false, message: "Erro ao verificar pagamento existente." };
  }
  if (existing) {
    return { success: false, message: "Pagamento já registrado para este período." };
  }

  const { error } = await supabase.from("payments").insert({
    player_id: input.playerId,
    session_id: input.type === "diaria" ? input.sessionId : null,
    amount: input.amount,
    type: input.type,
    status: "pago",
    reference_month: input.referenceMonth,
  });

  if (error) {
    return { success: false, message: "Erro ao registrar pagamento." };
  }

  revalidatePath("/admin/financeiro");
  return { success: true };
}
