"use client";

import { useTransition } from "react";
import { signOut } from "@/app/actions/auth";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => signOut())}
      className="flex min-h-11 items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground disabled:opacity-50"
    >
      <span aria-hidden="true">🚪</span>
      {isPending ? "Saindo…" : "Sair"}
    </button>
  );
}
