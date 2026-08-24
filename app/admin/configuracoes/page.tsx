import { createClient } from "@/utils/supabase/server";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { AdminProfileForm } from "./AdminProfileForm";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = { nome: "", phone: "", email: user?.email ?? "", photoUrl: null as string | null };
  if (user) {
    const { data } = await supabase
      .from("admin_profiles")
      .select("nome, phone, email, photo_url")
      .eq("id", user.id)
      .maybeSingle();

    if (data) {
      profile = {
        nome: data.nome ?? "",
        phone: data.phone ?? "",
        email: data.email ?? user.email ?? "",
        photoUrl: data.photo_url,
      };
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-foreground/60">Seu perfil e a segurança da conta.</p>
      </div>

      <section className="flex flex-col gap-4 rounded-lg border border-foreground/10 bg-card p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
          👤 Meu Perfil
        </h2>
        <AdminProfileForm initial={profile} />
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-foreground/10 bg-card p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
          Trocar Senha
        </h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
