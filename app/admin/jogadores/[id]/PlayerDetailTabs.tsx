"use client";

import { useState, type ReactNode } from "react";

const TABS = [
  { key: "perfil", label: "Perfil & Desempenho" },
  { key: "financeiro", label: "Financeiro" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/**
 * Tab switcher for the admin ficha (/admin/jogadores/[id]) — avoids the
 * long single-column scroll of stacking Perfil, Scouting, Estatísticas
 * and Financeiro all on one page, especially on mobile. Same visual
 * pattern (and the same active/inactive token usage) as
 * app/admin/jogadores/JogadoresTabs.tsx: both tab bodies are Server
 * Components already resolved by the parent page and handed in as props,
 * so switching tabs here is just a visibility toggle, not a re-fetch.
 */
export function PlayerDetailTabs({
  perfil,
  financeiro,
}: {
  perfil: ReactNode;
  financeiro: ReactNode;
}) {
  const [active, setActive] = useState<TabKey>("perfil");

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

      <div role="tabpanel">{active === "perfil" ? perfil : financeiro}</div>
    </div>
  );
}
