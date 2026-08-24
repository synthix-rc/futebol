import Image from "next/image";
import Link from "next/link";
import { AdminIdentity } from "./AdminIdentity";
import { MobileBottomNav, SidebarNav } from "./AdminNav";
import { SignOutButton } from "./SignOutButton";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1">
      <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r border-foreground/10 p-4 sm:flex">
        <Link href="/" className="flex items-center gap-2.5 px-3">
          <Image
            src="/logo-futebol.png"
            alt=""
            width={48}
            height={48}
            priority
            className="h-10 w-10 shrink-0"
          />
          {/* Broken across 2 lines — the full name doesn't fit on one line
              at a legible size inside the sidebar's fixed width. */}
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-bold">Resenha</span>
            <span className="text-[11px] font-medium text-foreground/60">
              Sesi Senai e Amigos
            </span>
          </span>
        </Link>
        <SidebarNav />
        <div className="mt-auto flex flex-col gap-3 border-t border-foreground/10 pt-4">
          <AdminIdentity />
          <SignOutButton />
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-foreground/10 px-6 py-4 sm:hidden">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo-futebol.png"
              alt=""
              width={40}
              height={40}
              priority
              className="h-10 w-10 shrink-0"
            />
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-bold">Resenha</span>
              <span className="text-[11px] font-medium text-foreground/60">
                Sesi Senai e Amigos
              </span>
            </span>
          </Link>
          <SignOutButton />
        </header>

        <div className="flex flex-1 flex-col pb-16 sm:pb-0">{children}</div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
