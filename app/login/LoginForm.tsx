"use client";

import { useState, useTransition } from "react";
import { signIn } from "@/app/actions/auth";
import { PasswordInput } from "@/app/components/PasswordInput";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signIn({ email, password, redirectTo });
      // On success the action redirects and never returns here.
      if (!result.success) {
        setError(result.message ?? "Erro ao entrar.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        E-mail
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
          inputMode="email"
          className="min-h-11 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
        />
      </label>

      <PasswordInput
        label="Senha"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        required
      />

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="min-h-11 rounded-md bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
