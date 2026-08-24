import type { NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/proxy";

// Renamed from `middleware.ts` in this Next.js version — same mechanism,
// see node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md.
export function proxy(request: NextRequest) {
  return updateSession(request);
}

// Inclusion list, not an exclusion list — anything not matched here (e.g.
// /cadastro, the public player self-registration form) never runs through
// this proxy at all, so it's public by construction. No explicit "public
// route" exception is needed for it.
export const config = {
  matcher: ["/admin/:path*", "/login"],
};
