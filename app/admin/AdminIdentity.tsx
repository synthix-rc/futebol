import { createClient } from "@/utils/supabase/server";
import { PlayerAvatar } from "@/app/admin/jogadores/PlayerAvatar";

/**
 * Small identity block above the sidebar's "Sair" button — who's actually
 * logged in right now. Reads admin_profiles (edited at
 * /admin/configuracoes) keyed by the session's own user id, never a value
 * passed in from anywhere else. If the admin hasn't filled in a profile
 * yet (or has no `nome`), falls back to their auth e-mail so the block
 * never renders empty.
 */
export async function AdminIdentity() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("nome, photo_url")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.nome?.trim() || user.email || "Admin";

  return (
    <div className="flex items-center gap-2.5 px-3">
      <PlayerAvatar photoUrl={profile?.photo_url ?? null} name={displayName} />
      <span className="truncate text-sm font-medium">{displayName}</span>
    </div>
  );
}
