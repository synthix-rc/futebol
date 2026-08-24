import { createClient } from "@/utils/supabase/server";
import type { Json } from "@/types/supabase";

/**
 * Audit Trail capture — call this at the tail of a Server Action, right
 * after its mutation has already succeeded. Resolves the acting admin from
 * the session cookie itself (`auth.getUser()`), the same re-validated
 * source `requireUser()` (utils/auth.ts) uses, rather than trusting an id
 * threaded in by the caller.
 *
 * `entity_id` is a `uuid` column in the DB — pass a real row id or leave
 * it undefined, never a non-UUID string, or the insert will fail (and be
 * swallowed, see below).
 *
 * A logging failure (network hiccup, no session, the FK target missing)
 * is swallowed, not thrown — a broken audit trail must never take down the
 * mutation it's describing. It's logged to the server console so it isn't
 * silently invisible either.
 */
export async function logAction(
  action: string,
  entityType: string,
  entityId?: string | null,
  details?: Json,
): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // audit_logs.admin_id FKs to admin_profiles(id), not auth.users(id)
    // directly — make sure a profile row exists (even an empty one, for an
    // admin who has never visited /admin/configuracoes) before inserting,
    // so the very first action from a brand-new admin doesn't fail the FK.
    await supabase
      .from("admin_profiles")
      .upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });

    await supabase.from("audit_logs").insert({
      admin_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      details: details ?? null,
    });
  } catch (err) {
    console.error("[audit] falha ao registrar log:", err);
  }
}
