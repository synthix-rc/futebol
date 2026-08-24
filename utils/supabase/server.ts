import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side Supabase client for use inside Server Components, Server
// Actions and Route Handlers. `cookies()` is async in this Next.js version,
// so this factory is async too — always `await createClient()`.
//
// Not typed against a generated `Database` schema (see types/supabase.ts for
// why) — swap in `createServerClient<Database>(...)` once you run
// `supabase gen types typescript` against the real project.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component during render — safe to ignore
            // as long as sessions are refreshed elsewhere (e.g. a proxy).
          }
        },
      },
    },
  );
}
