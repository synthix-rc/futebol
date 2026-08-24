import Link from "next/link";
import { MobileBottomNav, SidebarNav } from "./AdminNav";
import { SignOutButton } from "./SignOutButton";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1">
      <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r border-foreground/10 p-4 sm:flex">
        <Link href="/" className="px-3 text-sm font-semibold">
          ⚽ Painel do Admin
        </Link>
        <SidebarNav />
        <div className="mt-auto border-t border-foreground/10 pt-4">
          <SignOutButton />
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-foreground/10 px-6 py-4 sm:hidden">
          <Link href="/" className="text-sm font-semibold">
            ⚽ Painel do Admin
          </Link>
          <SignOutButton />
        </header>

        <div className="flex flex-1 flex-col pb-16 sm:pb-0">{children}</div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
