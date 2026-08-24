import { ChangePasswordForm } from "./ChangePasswordForm";

export default function ConfiguracoesPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-foreground/60">Segurança da conta do admin.</p>
      </div>

      <section className="flex flex-col gap-4 rounded-lg border border-foreground/10 p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
          Trocar Senha
        </h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
