"use client";

import { useRef, useState, useTransition } from "react";
import { upsertAdminProfile } from "@/app/actions/adminProfile";
import { uploadAvatar } from "@/utils/storage";
import { AvatarCropModal } from "@/app/cadastro/AvatarCropModal";

const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

export type AdminProfileData = {
  nome: string;
  phone: string;
  email: string;
  photoUrl: string | null;
};

/**
 * "Meu Perfil" — the admin editing their own name/WhatsApp/e-mail/photo,
 * later shown next to every entry they make in the Audit Trail
 * (/admin/auditoria). Reuses the same crop-then-upload flow as the player
 * cadastro form (AvatarCropModal + utils/storage.ts's uploadAvatar into
 * the `avatars` bucket) — it's generic, nothing player-specific in it.
 */
export function AdminProfileForm({ initial }: { initial: AdminProfileData }) {
  const [nome, setNome] = useState(initial.nome);
  const [phone, setPhone] = useState(initial.phone);
  const [email, setEmail] = useState(initial.email);
  const [photoUrl, setPhotoUrl] = useState(initial.photoUrl);

  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initial.photoUrl);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setPhotoError(null);
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("Foto muito grande — máximo 3MB. Escolha outra ou tire com menos resolução.");
      return;
    }

    setRawImageSrc(URL.createObjectURL(file));
  }

  async function handleCropped(blob: Blob) {
    setRawImageSrc(null);
    setIsUploadingPhoto(true);
    setPhotoError(null);

    const uploadResult = await uploadAvatar(blob);
    setIsUploadingPhoto(false);

    if ("error" in uploadResult) {
      setPhotoError(uploadResult.error);
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(uploadResult.url);
    setPhotoUrl(uploadResult.url);
  }

  function handleCropCancel() {
    setRawImageSrc(null);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await upsertAdminProfile({ nome, phone, email, photoUrl });
      if (!result.success) {
        setError(result.message ?? "Erro ao salvar perfil.");
        return;
      }
      setSuccess(true);
    });
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingPhoto}
            className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-foreground/25 bg-foreground/5 text-3xl transition-colors hover:border-foreground/40 disabled:opacity-50"
            aria-label="Trocar foto"
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage / local blob preview URL
              <img src={previewUrl} alt="Prévia da foto" className="h-full w-full object-cover" />
            ) : (
              "📷"
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <span className="text-xs text-foreground/50">
            {isUploadingPhoto ? "Enviando foto…" : "Foto (opcional) · Máximo 3MB"}
          </span>
          {photoError && <p className="text-xs text-red-500">{photoError}</p>}
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Nome
          <input
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            autoComplete="name"
            className="min-h-11 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          WhatsApp
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            inputMode="tel"
            autoComplete="tel"
            placeholder="(11) 91234-5678"
            className="min-h-11 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          E-mail
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            inputMode="email"
            autoComplete="email"
            className="min-h-11 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
          />
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            Perfil atualizado!
          </p>
        )}

        <button
          type="submit"
          disabled={isPending || isUploadingPhoto}
          className="min-h-11 rounded-md bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Salvando…" : "Salvar Perfil"}
        </button>
      </form>

      {rawImageSrc && (
        <AvatarCropModal
          imageSrc={rawImageSrc}
          onCancel={handleCropCancel}
          onCropped={handleCropped}
        />
      )}
    </>
  );
}
