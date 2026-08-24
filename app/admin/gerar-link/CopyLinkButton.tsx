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

export function CopyLinkButton({ path }: { path: string }) {
  const origin = useSyncExternalStore(subscribe, getClientOrigin, getServerOrigin);
  const [copied, setCopied] = useState(false);
  const fullUrl = `${origin}${path}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 truncate rounded-md border border-foreground/10 bg-foreground/[0.03] px-3 py-2 text-xs">
        {fullUrl}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        className="whitespace-nowrap rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        {copied ? "Copiado!" : "Copiar Link"}
      </button>
    </div>
  );
}
