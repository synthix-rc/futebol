"use client";

import { useState, useSyncExternalStore } from "react";

function subscribe() {
  // window.location.origin never changes without a full page reload, so
  // there's nothing to subscribe to — this store only needs a snapshot.
  return () => {};
}

function getClientOrigin() {
  return window.location.origin;
}

function getServerOrigin() {
  // Matches the client's first render before hydration (window.location
  // isn't available during SSR) — no hydration mismatch.
  return "";
}

/**
 * Copies this player's public "Magic Link" (/perfil/[id] — no login, the
 * URL itself is the credential) straight to the clipboard, right next to
 * the name/status in the ficha header where the admin is already looking
 * when they need to hand it to someone.
 */
export function CopyMagicLinkButton({ playerId }: { playerId: string }) {
  const origin = useSyncExternalStore(subscribe, getClientOrigin, getServerOrigin);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`${origin}/perfil/${playerId}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="min-h-9 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
    >
      {copied ? "✅ Copiado!" : "🔗 Copiar Magic Link"}
    </button>
  );
}
