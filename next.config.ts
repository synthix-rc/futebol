import type { NextConfig } from "next";

// Security headers applied to every response. Deliberately does NOT set a
// full Content-Security-Policy (script-src/style-src/etc.) here — Next.js
// App Router streams inline hydration scripts, and getting a strict CSP
// wrong for that (no live browser available to verify against in this
// environment) risks a silent white-screen in production. The directives
// below are the ones safe to ship without that risk: none of them touch
// how Next.js loads its own scripts/styles, so there's nothing here that
// can break rendering.
const securityHeaders = [
  // Equivalent to (and a superset of) X-Frame-Options — blocks this app
  // from ever being loaded inside an <iframe> on another site
  // (clickjacking). No route here uses framing, so this is pure upside.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
  // Belt-and-suspenders for older browsers that don't honor
  // frame-ancestors.
  { key: "X-Frame-Options", value: "DENY" },
  // Stops the browser from guessing a response's MIME type and executing
  // it as something other than what the server declared.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak the full referring URL (which can contain a session id in
  // a path segment, e.g. /perfil/[id]) to a third-party site linked from
  // this app.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // This app never uses the camera, microphone, or geolocation APIs.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Browsers only honor this over an already-HTTPS connection, so it's a
  // no-op locally over http:// and pure upside in production.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
