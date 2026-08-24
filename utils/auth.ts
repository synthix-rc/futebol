import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Verifies the caller is logged in — re-validates the JWT against
 * Supabase's auth server (getUser()), not just the session cookie's claims
 * (getSession(), which is not safe to trust server-side without this).
 *
 * Call this first in every admin-only Server Action. `proxy.ts` already
 * blocks unauthenticated page loads under /admin, but Server Actions are
 * reachable via direct POST regardless of which page rendered the form
 * that normally calls them, so each one re-checks independently.
 * `confirmPresence` (app/actions/rsvp.ts) is the deliberate exception —
 * it's the public RSVP flow and must stay unauthenticated.
 */
export async function requireUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
