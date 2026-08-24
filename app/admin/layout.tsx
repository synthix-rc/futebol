import Link from "next/link";
import { AdminNav } from "./AdminNav";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-foreground/10">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Link href="/" className="text-sm font-semibold">
            ⚽ Painel do Admin
          </Link>
          <AdminNav />
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
