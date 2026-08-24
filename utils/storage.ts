import { createClient } from "@/utils/supabase/client";

const RECEIPTS_BUCKET = "comprovantes";
const AVATARS_BUCKET = "avatars";

type UploadResult = { url: string } | { error: string };

/**
 * Shared upload primitive: pushes a File/Blob straight from the browser to
 * a Storage bucket and returns its public URL. Client-side, not through a
 * Server Action — those cap request bodies at 1MB by default, and a
 * phone-camera photo routinely exceeds that; only the resulting URL string
 * needs to reach the server afterward (see app/actions/finance.ts,
 * app/actions/players.ts).
 */
async function uploadToBucket(
  bucket: string,
  path: string,
  file: File | Blob,
  options: { contentType?: string } = {},
): Promise<UploadResult> {
  const supabase = createClient();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: "3600", upsert: false, ...options });

  if (error) {
    return {
      error: `Erro ao enviar arquivo. Se o bucket "${bucket}" ainda não foi criado no Supabase (público), peça ao admin para criá-lo antes.`,
    };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl };
}

/**
 * Uploads a receipt (payment or expense proof) to the `comprovantes`
 * bucket. Created by hand in the dashboard, not by a migration — until it
 * exists, this rejects with a clear error rather than something opaque.
 */
export async function uploadReceipt(
  file: File,
  folder: "payments" | "expenses",
): Promise<UploadResult> {
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${folder}/${crypto.randomUUID()}-${safeName}`;
  return uploadToBucket(RECEIPTS_BUCKET, path, file);
}

/**
 * Uploads an already-cropped avatar (a JPEG Blob from
 * app/cadastro/cropImage.ts) to the `avatars` bucket — also created by
 * hand in the dashboard, also public.
 */
export async function uploadAvatar(blob: Blob): Promise<UploadResult> {
  const path = `${crypto.randomUUID()}.jpg`;
  return uploadToBucket(AVATARS_BUCKET, path, blob, { contentType: "image/jpeg" });
}
