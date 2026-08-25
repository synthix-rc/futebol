"use client";

import { useState, type ReactNode } from "react";

const TABS = [
  { key: "desempenho", label: "Meu Desempenho" },
  { key: "financeiro", label: "Financeiro" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/**
 * Tab switcher for the public Magic Link (/perfil/[id]) — same visual
 * pattern as the admin ficha's PlayerDetailTabs (and JogadoresTabs before
 * it): both tab bodies are Server Components already resolved by the
 * parent page and handed in as props, so this is just a visibility
 * toggle, not a re-fetch. Deliberately does NOT take a "scouting" prop —
 * the radar chart/ratings never reach this component at all, so there's
 * nothing here that could accidentally render them.
 */
export function PlayerProfileTabs({
  desempenho,
  financeiro,
}: {
  desempenho: ReactNode;
  financeiro: ReactNode;
}) {
  const [active, setActive] = useState<TabKey>("desempenho");

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

      <div role="tabpanel">{active === "desempenho" ? desempenho : financeiro}</div>
    </div>
  );
}
