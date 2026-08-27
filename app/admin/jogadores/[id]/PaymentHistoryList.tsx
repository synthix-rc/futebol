import type { PaymentCategory } from "@/types/supabase";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const CATEGORY_STYLES: Record<PaymentCategory, { label: string; className: string }> = {
  campo: { label: "⚽ Campo", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  churrasco: {
    label: "🥩 Churrasco",
    className: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
};

/** The category badge itself, exported so every payment list in the app —
 * this one, the "Visão do Dia" list on /admin/financeiro, wherever else —
 * renders the exact same pill instead of a re-styled lookalike. */
export function CategoryBadge({ category }: { category: PaymentCategory }) {
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${CATEGORY_STYLES[category].className}`}
    >
      {CATEGORY_STYLES[category].label}
    </span>
  );
}

export type PaymentHistoryEntry = {
  id: string;
  amount: number;
  category: PaymentCategory;
  /** When the payment was recorded — there's no separate "paid on" column
   * in the schema, so `created_at` is the closest real timestamp. */
  paidAt: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

/**
 * Histórico de pagamentos — strictly read-only, shared as-is between the
 * admin ficha (/admin/jogadores/[id]) and the public Magic Link
 * (/perfil/[id]), the same way PlayerAvatar already is: purely
 * presentational, nothing here can mutate anything, so reusing it on the
 * public side needs no extra guard.
 */
export function PaymentHistoryList({ payments }: { payments: PaymentHistoryEntry[] }) {
  if (payments.length === 0) {
    return <p className="text-sm text-foreground/40">Nenhum pagamento registrado ainda.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {payments.map((payment) => (
        <li
          key={payment.id}
          className="flex flex-wrap items-center gap-2 rounded-md border border-foreground/10 bg-card px-3 py-2 text-sm"
        >
          <span className="flex-1 text-foreground/60">{formatDate(payment.paidAt)}</span>
          <span className="font-mono">{currency.format(payment.amount)}</span>
          <CategoryBadge category={payment.category} />
        </li>
      ))}
    </ul>
  );
}
