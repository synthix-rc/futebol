import { createClient } from "@/utils/supabase/client";

const RECEIPTS_BUCKET = "comprovantes";

/**
 * Uploads a receipt file (payment or expense proof) directly from the
 * browser to the `comprovantes` Storage bucket and returns its public URL.
 *
 * Done client-side rather than through a Server Action: Server Actions cap
 * request bodies at 1MB by default, and a phone-camera photo of a receipt
 * routinely exceeds that. Uploading straight to Storage from the browser
 * has no such limit; only the resulting URL string needs to reach the
 * server afterward (see app/actions/finance.ts).
 *
 * The `comprovantes` bucket is created by hand in the Supabase dashboard
 * (not by a migration) and must be marked **public** for the returned URL
 * to actually resolve — until it exists, this rejects with a clear error
 * rather than throwing something opaque.
 */
export async function uploadReceipt(
  file: File,
  folder: "payments" | "expenses",
): Promise<{ url: string } | { error: string }> {
  const supabase = createClient();

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${folder}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (uploadError) {
    return {
      error:
        "Erro ao enviar comprovante. Se o bucket \"comprovantes\" ainda não foi criado no Supabase, peça ao admin para criá-lo (público) antes de anexar arquivos.",
    };
  }

  const { data } = supabase.storage.from(RECEIPTS_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}
