"use client";

import { useState, useTransition } from "react";
import { changePassword } from "@/app/actions/auth";
import { PasswordInput } from "@/app/components/PasswordInput";

export function ChangePasswordForm() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    startTransition(async () => {
      const result = await changePassword(newPassword);
      if (!result.success) {
        setError(result.message ?? "Erro ao trocar a senha.");
        return;
      }
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PasswordInput
        label="Nova Senha"
        value={newPassword}
        onChange={setNewPassword}
        autoComplete="new-password"
        required
      />
      <PasswordInput
        label="Confirmar Nova Senha"
        value={confirmPassword}
        onChange={setConfirmPassword}
        autoComplete="new-password"
        required
      />

      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Senha atualizada com sucesso!
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="min-h-11 rounded-md bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Salvando…" : "Trocar Senha"}
      </button>
    </form>
  );
}
