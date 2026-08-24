"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard Inicial", short: "Dashboard", icon: "🏠" },
  { href: "/admin/quadra", label: "A Quadra (Jogo Hoje)", short: "Quadra", icon: "⚔️" },
  { href: "/admin/gerar-link", label: "Gerar Link (Sessão)", short: "Link", icon: "🔗" },
  { href: "/admin/jogadores", label: "Ficha de Jogadores", short: "Jogadores", icon: "👥" },
  { href: "/admin/financeiro", label: "Financeiro (Caixa)", short: "Financeiro", icon: "💰" },
] as const;

function isActiveHref(pathname: string | null, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || (pathname?.startsWith(`${href}/`) ?? false);
}

/** Desktop: vertical list inside the fixed sidebar (app/admin/layout.tsx). */
export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = isActiveHref(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-foreground text-background"
                : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
            }`}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Mobile: fixed bottom tab bar replacing the sidebar under `sm`. Rendered
 * as a sibling of the (hidden-on-mobile) sidebar, not nested inside it —
 * an ancestor's `display: none` would hide this too regardless of its own
 * `fixed` positioning.
 */
export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-foreground/10 bg-background/95 backdrop-blur sm:hidden">
      {NAV_ITEMS.map((item) => {
        const active = isActiveHref(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
              active ? "text-foreground" : "text-foreground/50"
            }`}
          >
            <span aria-hidden="true" className="text-base leading-none">
              {item.icon}
            </span>
            <span className="truncate">{item.short}</span>
          </Link>
        );
      })}
    </nav>
  );
}
