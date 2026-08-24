"use client";

import { useState, type ReactNode } from "react";

const TABS = [
  { key: "elenco", label: "Elenco" },
  { key: "stats", label: "Estatísticas & Rankings" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/**
 * Tab switcher for /admin/jogadores — "Elenco" (the inline-edit roster
 * table) vs "Estatísticas & Rankings" (the Hall da Fama). Both tab bodies
 * are Server Components already resolved by the parent page and handed in
 * as props; this just toggles which one is mounted, no re-fetching.
 */
export function JogadoresTabs({ elenco, stats }: { elenco: ReactNode; stats: ReactNode }) {
  const [active, setActive] = useState<TabKey>("elenco");

  return (
    <div className="flex flex-col gap-6">
      <div
        role="tablist"
        className="flex gap-1 rounded-lg border border-foreground/10 bg-card p-1"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => setActive(tab.key)}
            className={`min-h-11 flex-1 rounded-md px-3 text-sm font-semibold transition-colors ${
              active === tab.key
                ? "bg-primary text-primary-foreground"
                : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">{active === "elenco" ? elenco : stats}</div>
    </div>
  );
}
