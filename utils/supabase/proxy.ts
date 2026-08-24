import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_PATH_PREFIX = "/admin";
const LOGIN_PATH = "/login";

/**
 * Runs on every matched request (see proxy.ts's `config.matcher`): refreshes
 * the Supabase session cookie and gates /admin behind a logged-in user.
 *
 * Uses `supabase.auth.getUser()`, which re-validates the JWT against
 * Supabase's auth server, rather than trusting the session cookie's claims
 * unverified — this is Supabase's own recommended pattern for SSR route
 * protection (Next's generic Proxy guidance says to avoid this kind of
 * network call for "optimistic checks", but that guidance is about a
 * self-rolled cookie session; Supabase's model specifically calls for
 * server-side verification here).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname.startsWith(ADMIN_PATH_PREFIX);
  const isLoginRoute = pathname === LOGIN_PATH;

  if (isAdminRoute && !user) {
    const redirectUrl = new URL(LOGIN_PATH, request.url);
    redirectUrl.searchParams.set("redirectTo", pathname);
    return withRefreshedCookies(NextResponse.redirect(redirectUrl), response);
  }

  if (isLoginRoute && user) {
    return withRefreshedCookies(
      NextResponse.redirect(new URL(ADMIN_PATH_PREFIX, request.url)),
      response,
    );
  }

  return response;
}

/**
 * A redirect built via `NextResponse.redirect(url)` is a brand-new response
 * object — it does NOT carry over cookies `setAll` wrote onto `response`
 * during `getUser()`'s session refresh above. Skipping this copy is a real
 * bug, not just a staleness nitpick: the browser never receives the
 * rotated session cookie, keeps sending the old (now-consumed) refresh
 * token on every subsequent request, and the resulting repeated
 * refresh/retry cycle can pile up cookie data across redirects until
 * requests start failing with 431 (Request Header Fields Too Large).
 */
function withRefreshedCookies(
  redirectResponse: NextResponse,
  sourceResponse: NextResponse,
): NextResponse {
  sourceResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}
