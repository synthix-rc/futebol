"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { getCroppedImageBlob } from "./cropImage";

/**
 * Full-screen touch-first crop UI (react-easy-crop handles pinch-zoom and
 * drag natively) — 1:1 round crop for an avatar. Confirming runs the
 * selection through cropImage.ts's canvas extraction and hands the caller
 * a ready-to-upload JPEG Blob.
 */
export function AvatarCropModal({
  imageSrc,
  onCancel,
  onCropped,
}: {
  imageSrc: string;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCropComplete = useCallback((_croppedArea: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleConfirm() {
    if (!croppedAreaPixels) return;
    setError(null);
    setIsProcessing(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, rotation);
      onCropped(blob);
    } catch {
      setError("Erro ao processar a imagem. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={handleCropComplete}
        />
      </div>

      <div className="flex flex-col gap-4 bg-card p-4">
        <label className="flex flex-col gap-1 text-xs text-foreground/60">
          Zoom
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="h-11 w-full accent-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-foreground/60">
          Girar
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={rotation}
            onChange={(event) => setRotation(Number(event.target.value))}
            className="h-11 w-full accent-foreground"
          />
        </label>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 flex-1 rounded-md border border-foreground/20 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-foreground/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isProcessing || !croppedAreaPixels}
            onClick={handleConfirm}
            className="min-h-11 flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isProcessing ? "Processando…" : "Usar Foto"}
          </button>
        </div>
      </div>
    </div>
  );
}
