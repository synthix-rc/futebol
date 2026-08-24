"use client";

import { useState } from "react";
import { uploadReceipt } from "@/utils/storage";

type Status = "idle" | "uploading" | "done" | "error";

/**
 * File input styled as a large tappable button (min ~44px target, per
 * mobile touch-target guidance) — uploads straight to Storage from the
 * browser (see utils/storage.ts) and reports the resulting public URL up.
 */
export function ReceiptUploadField({
  folder,
  onUploaded,
}: {
  folder: "payments" | "expenses";
  onUploaded: (url: string | null) => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus("uploading");
    setError(null);
    setFileName(file.name);

    const result = await uploadReceipt(file, folder);

    if ("error" in result) {
      setStatus("error");
      setError(result.error);
      onUploaded(null);
      return;
    }

    setStatus("done");
    onUploaded(result.url);
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-foreground/25 px-3 py-2 text-xs font-medium text-foreground/60 transition-colors hover:border-foreground/40 hover:bg-foreground/5">
        <span aria-hidden="true">📎</span>
        <span className="truncate">
          {status === "uploading"
            ? "Enviando…"
            : status === "done"
              ? `Anexado: ${fileName}`
              : "Anexar Comprovante"}
        </span>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={handleChange}
          className="hidden"
        />
      </label>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
