import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { ExpenseCategory, PaymentType } from "@/types/supabase";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  campo: "Campo",
  material: "Material",
  goleiro: "Goleiro",
  churrasco: "Churrasco",
  outros: "Outros",
};

type LedgerEntry = {
  id: string;
  date: Date;
  kind: "entrada" | "saida";
  label: string;
  sublabel: string;
  amount: number;
  receiptUrl: string | null;
};

/**
 * Public, read-only extrato — no admin gate, same as /lista/[sessionId].
 * Purely a Server Component: the only interactive element is a plain
 * `<a target="_blank">` for receipts, so no client JS is needed at all.
 */
export default async function FinanceiroPublicoPage() {
  const supabase = await createClient();

  const [{ data: payments }, { data: expenses }] = await Promise.all([
    supabase
      .from("payments")
      .select("id, amount, type, created_at, receipt_url, guest_name, players(name)")
      .eq("status", "pago")
      .order("created_at", { ascending: false })
      .overrideTypes<
        Array<{
          id: string;
          amount: number;
          type: PaymentType;
          created_at: string;
          receipt_url: string | null;
          guest_name: string | null;
          players: { name: string } | null;
        }>,
        { merge: false }
      >(),
    supabase
      .from("expenses")
      .select("id, description, amount, category, expense_date, receipt_url")
      .order("expense_date", { ascending: false })
      .overrideTypes<
        Array<{
          id: string;
          description: string;
          amount: number;
          category: ExpenseCategory;
          expense_date: string;
          receipt_url: string | null;
        }>,
        { merge: false }
      >(),
  ]);

  const entries: LedgerEntry[] = [
    ...(payments ?? []).map((p) => ({
      id: `payment-${p.id}`,
      date: new Date(p.created_at),
      kind: "entrada" as const,
      label: p.players?.name ?? p.guest_name ?? "Jogador",
      sublabel: p.type === "mensalidade" ? "Mensalidade" : "Diária",
      amount: Number(p.amount),
      receiptUrl: p.receipt_url,
    })),
    ...(expenses ?? []).map((e) => ({
      id: `expense-${e.id}`,
      // Noon UTC so this sorts sensibly alongside real timestamps without
      // a timezone edge shifting it to the wrong day.
      date: new Date(`${e.expense_date}T12:00:00.000Z`),
      kind: "saida" as const,
      label: e.description,
      sublabel: CATEGORY_LABELS[e.category],
      amount: Number(e.amount),
      receiptUrl: e.receipt_url,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const totalEntradas = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const totalSaidas = (expenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0);
  const saldo = totalEntradas - totalSaidas;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Extrato Financeiro</h1>
          <p className="text-sm text-foreground/60">Transparência da pelada.</p>
        </div>
        <Link href="/" className="text-sm underline underline-offset-4">
          Início
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Entradas" value={currency.format(totalEntradas)} tone="positive" />
        <SummaryCard label="Saídas" value={currency.format(totalSaidas)} tone="negative" />
        <SummaryCard
          label="Saldo"
          value={currency.format(saldo)}
          tone={saldo < 0 ? "negative" : "positive"}
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
          Extrato
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm text-foreground/40">Nenhum lançamento ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-foreground/10 bg-card p-4"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{entry.label}</span>
                  <span className="text-xs text-foreground/50">
                    {entry.sublabel} · {formatDate(entry.date)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-semibold ${
                      entry.kind === "entrada"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-500"
                    }`}
                  >
                    {entry.kind === "entrada" ? "+" : "−"} {currency.format(entry.amount)}
                  </span>
                  {entry.receiptUrl && (
                    <a
                      href={entry.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Ver comprovante"
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-foreground/20 text-base transition-colors hover:bg-foreground/5"
                    >
                      🧾
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "positive" | "negative";
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-foreground/10 bg-card p-4">
      <span className="text-[10px] uppercase tracking-wide text-foreground/40">
        {label}
      </span>
      <span
        className={`text-lg font-bold ${
          tone === "negative" ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
