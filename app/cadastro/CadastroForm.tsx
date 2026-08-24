"use client";

import { useRef, useState, useTransition } from "react";
import { registerPlayer } from "@/app/actions/players";
import { uploadAvatar } from "@/utils/storage";
import type { PlayerType } from "@/types/supabase";
import { AvatarCropModal } from "./AvatarCropModal";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

export function CadastroForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<PlayerType | null>(null);
  const [email, setEmail] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");

  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
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

  function handleCropped(blob: Blob) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setCroppedBlob(blob);
    setPreviewUrl(URL.createObjectURL(blob));
    setRawImageSrc(null);
  }

  function handleCropCancel() {
    setRawImageSrc(null);
  }

  const canSubmit = name.trim().length > 0 && phone.trim().length > 0 && type !== null;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!type) return;
    setError(null);

    startTransition(async () => {
      let photoUrl: string | null = null;

      if (croppedBlob) {
        const uploadResult = await uploadAvatar(croppedBlob);
        if ("error" in uploadResult) {
          setError(uploadResult.error);
          return;
        }
        photoUrl = uploadResult.url;
      }

      const result = await registerPlayer({
        name,
        phone,
        type,
        email: email || null,
        birthDay: birthDay ? Number(birthDay) : null,
        birthMonth: birthMonth ? Number(birthMonth) : null,
        photoUrl,
      });

      if (!result.success) {
        setError(result.message ?? "Erro ao enviar cadastro.");
        return;
      }

      setSuccess(true);
    });
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-foreground/10 p-8 text-center">
        <p className="text-4xl">✅</p>
        <h2 className="text-lg font-semibold">Cadastro enviado!</h2>
        <p className="text-sm text-foreground/60">
          O admin vai avaliar seu perfil em breve. Assim que for aprovado,
          você poderá confirmar presença nas peladas.
        </p>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-foreground/25 bg-foreground/5 text-3xl transition-colors hover:border-foreground/40"
            aria-label="Escolher foto"
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- local blob preview, next/image can't optimize a blob: URL
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
          <span className="text-xs text-foreground/50">Foto (opcional) · Máximo 3MB</span>
          {photoError && <p className="text-xs text-red-500">{photoError}</p>}
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Nome completo
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
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
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="(11) 91234-5678"
            className="min-h-11 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
          />
        </label>

        <div className="flex flex-col gap-1.5 text-sm">
          Tipo
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType("mensalista")}
              className={`min-h-11 rounded-md border px-3 py-2.5 text-sm font-semibold transition-colors ${
                type === "mensalista"
                  ? "border-foreground bg-foreground text-background"
                  : "border-foreground/20 hover:bg-foreground/5"
              }`}
            >
              Mensalista
            </button>
            <button
              type="button"
              onClick={() => setType("diarista")}
              className={`min-h-11 rounded-md border px-3 py-2.5 text-sm font-semibold transition-colors ${
                type === "diarista"
                  ? "border-foreground bg-foreground text-background"
                  : "border-foreground/20 hover:bg-foreground/5"
              }`}
            >
              Diarista
            </button>
          </div>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          E-mail <span className="text-foreground/40">(opcional)</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            inputMode="email"
            autoComplete="email"
            className="min-h-11 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
          />
        </label>

        <div className="flex flex-col gap-1.5 text-sm">
          Aniversário <span className="text-foreground/40">(opcional)</span>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={birthDay}
              onChange={(event) => setBirthDay(event.target.value)}
              className="min-h-11 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
            >
              <option value="">Dia</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
            <select
              value={birthMonth}
              onChange={(event) => setBirthMonth(event.target.value)}
              className="min-h-11 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
            >
              <option value="">Mês</option>
              {MONTHS.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={isPending || !canSubmit}
          className="min-h-11 rounded-md bg-foreground px-4 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {isPending ? "Enviando…" : "Enviar Cadastro"}
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
