// Plain presentational pieces shared by PlayerTableRow (desktop) and
// PlayerListCard (mobile) — no hooks/state of their own, so no "use
// client" needed here; they work fine rendered inside either tree.
import type { PlayerType } from "@/types/supabase";

const RATING_OPTIONS = [1, 2, 3, 4, 5];

export function TypeBadge({ type }: { type: PlayerType | null }) {
  return (
    <span className="whitespace-nowrap rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-medium text-foreground/60">
      {type === "mensalista" ? "Mensalista" : type === "diarista" ? "Diarista" : "—"}
    </span>
  );
}

export function PendingBadge() {
  return (
    <span className="inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
      ⏳ Pendente
    </span>
  );
}

export function RatingSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col items-center gap-0.5 text-[9px] text-foreground/40">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="min-h-9 w-11 rounded-md border border-foreground/20 bg-background px-1 text-center text-xs"
      >
        {RATING_OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}
