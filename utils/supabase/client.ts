import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client. Only use inside Client Components.
//
// Not typed against a generated `Database` schema (see types/supabase.ts for
// why) — swap in `createBrowserClient<Database>(...)` once you run
// `supabase gen types typescript` against the real project.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
