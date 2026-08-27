"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { requireUser } from "@/utils/auth";
import { logAction } from "@/utils/audit";
import { monthKey } from "@/utils/dashboardMetrics";
import type { ExpenseCategory, PaymentCategory, PaymentType } from "@/types/supabase";

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
  /** Public Storage URL from utils/storage.ts's uploadReceipt, if attached. */
  receiptUrl?: string | null;
  /** BBQ Module — defaults to 'campo' so existing callers (e.g.
   * MensalidadeStatus.tsx, where a monthly fee is never a churrasco
   * contribution) don't need to pass it explicitly. */
  category?: PaymentCategory;
};

const REFERENCE_MONTH_PATTERN = /^\d{4}-\d{2}$/;
const PAYMENT_CATEGORIES: PaymentCategory[] = ["campo", "churrasco"];

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
  const category = input.category ?? "campo";
  if (!PAYMENT_CATEGORIES.includes(category)) {
    return { success: false, message: "Categoria de pagamento inválida." };
  }

  const supabase = await createClient();

  if (!(await requireUser(supabase))) {
    return { success: false, message: "Sessão expirada. Faça login novamente." };
  }

  // `category` is part of the uniqueness check too — a player can owe both
  // a 'campo' diária and a separate 'churrasco' contribution for the same
  // session, and those must be two distinct payment rows, not a collision.
  let existingQuery = supabase
    .from("payments")
    .select("id")
    .eq("player_id", input.playerId)
    .eq("type", input.type)
    .eq("reference_month", input.referenceMonth)
    .eq("category", category)
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

  const { data: inserted, error } = await supabase
    .from("payments")
    .insert({
      player_id: input.playerId,
      session_id: input.type === "diaria" ? input.sessionId : null,
      amount: input.amount,
      type: input.type,
      status: "pago",
      reference_month: input.referenceMonth,
      receipt_url: input.receiptUrl ?? null,
      category,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, message: "Erro ao registrar pagamento." };
  }

  await logAction("register_payment", "payment", inserted?.id, {
    playerId: input.playerId,
    type: input.type,
    amount: input.amount,
    referenceMonth: input.referenceMonth,
    category,
  });

  revalidatePath("/admin/financeiro");
  revalidatePath("/financeiro-publico");
  return { success: true };
}

export type GuestPaymentDestination = "campo" | "churrasco" | "ambos";
const GUEST_PAYMENT_DESTINATIONS: GuestPaymentDestination[] = ["campo", "churrasco", "ambos"];

/** Splits a total in two, rounded to whole cents, so the two halves always
 * sum back to exactly the original value — `value - half1` for the second
 * half rather than rounding both independently, which could otherwise
 * drift a cent off `value` and throw off "Resumo de Entradas do Mês". */
function splitEvenly(value: number): [number, number] {
  const half1 = Math.round((value * 100) / 2) / 100;
  const half2 = Math.round((value - half1) * 100) / 100;
  return [half1, half2];
}

/**
 * "Receita Avulsa" — diaristas are no longer registered as players at
 * all, so an ad-hoc/guest payment (day-of contribution from someone with
 * no `players` row) is recorded against a plain name instead of a
 * `player_id` (nullable since the guest-payment migration). Always
 * `status: 'pago'` and `type: 'diaria'` — there's no "pending" state for
 * a payment collected on the spot, and it's inherently a one-off, not a
 * monthly due.
 *
 * `destination: 'ambos'` isn't a real `category` value in the DB (only
 * 'campo'/'churrasco' exist there) — it's a form-level convenience that
 * splits `value` into two real rows, one of each category, so "Resumo de
 * Entradas do Mês" (which sums by category) keeps adding up correctly
 * without needing to know about a third "both" bucket.
 */
export async function registerGuestPayment(
  guestName: string,
  destination: GuestPaymentDestination,
  value: number,
): Promise<ActionResult> {
  const trimmedName = guestName.trim();
  if (!trimmedName) {
    return { success: false, message: "Informe o nome." };
  }
  if (!GUEST_PAYMENT_DESTINATIONS.includes(destination)) {
    return { success: false, message: "Destino inválido." };
  }
  if (!Number.isFinite(value) || value <= 0) {
    return { success: false, message: "Informe um valor válido." };
  }

  const supabase = await createClient();

  if (!(await requireUser(supabase))) {
    return { success: false, message: "Sessão expirada. Faça login novamente." };
  }

  const rows: Array<{ category: PaymentCategory; amount: number }> =
    destination === "ambos"
      ? (() => {
          const [campoAmount, churrascoAmount] = splitEvenly(value);
          return [
            { category: "campo", amount: campoAmount },
            { category: "churrasco", amount: churrascoAmount },
          ];
        })()
      : [{ category: destination, amount: value }];

  const referenceMonth = monthKey(new Date().toISOString());

  const { data: inserted, error } = await supabase
    .from("payments")
    .insert(
      rows.map((row) => ({
        player_id: null,
        guest_name: trimmedName,
        type: "diaria" as const,
        status: "pago" as const,
        reference_month: referenceMonth,
        category: row.category,
        amount: row.amount,
      })),
    )
    .select("id");

  if (error) {
    return { success: false, message: "Erro ao registrar pagamento." };
  }

  await logAction("register_guest_payment", "payment", inserted?.[0]?.id, {
    guestName: trimmedName,
    destination,
    value,
    rows,
  });

  revalidatePath("/admin/financeiro");
  revalidatePath("/financeiro-publico");
  return { success: true };
}

export type CreateExpenseInput = {
  description: string;
  amount: number;
  expenseDate: string; // 'YYYY-MM-DD'
  category: ExpenseCategory;
  sessionId?: string | null;
  paidByPlayerId?: string | null;
  receiptUrl?: string | null;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "campo",
  "material",
  "goleiro",
  "churrasco",
  "outros",
];

/** Records a "Saída" (expense) in the ledger. */
export async function createExpense(input: CreateExpenseInput): Promise<ActionResult> {
  if (!input.description.trim()) {
    return { success: false, message: "Descrição é obrigatória." };
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { success: false, message: "Informe um valor válido." };
  }
  if (!DATE_PATTERN.test(input.expenseDate)) {
    return { success: false, message: "Data inválida." };
  }
  if (!EXPENSE_CATEGORIES.includes(input.category)) {
    return { success: false, message: "Categoria inválida." };
  }

  const supabase = await createClient();

  if (!(await requireUser(supabase))) {
    return { success: false, message: "Sessão expirada. Faça login novamente." };
  }

  const { data: inserted, error } = await supabase
    .from("expenses")
    .insert({
      description: input.description.trim(),
      amount: input.amount,
      expense_date: input.expenseDate,
      category: input.category,
      session_id: input.sessionId ?? null,
      paid_by_player_id: input.paidByPlayerId ?? null,
      receipt_url: input.receiptUrl ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, message: "Erro ao registrar despesa." };
  }

  await logAction("create_expense", "expense", inserted?.id, {
    description: input.description.trim(),
    amount: input.amount,
    category: input.category,
  });

  revalidatePath("/admin/financeiro");
  revalidatePath("/financeiro-publico");
  return { success: true };
}
