import type { Area } from "react-easy-crop";

// Standard react-easy-crop canvas-extraction recipe: the library only
// reports *where* to crop (as percentages/pixels) — it doesn't produce the
// cropped image itself. Client-only (uses `Image`/`document`), so this
// must only ever be called from a Client Component.

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.crossOrigin = "anonymous";
    image.src = url;
  });
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** The bounding box of `width`x`height` after rotating by `rotation`
 * degrees, so the rotated image can be drawn without clipping corners. */
function rotatedSize(width: number, height: number, rotation: number) {
  const rotRad = toRadians(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

/** Renders the rotated+cropped selection to a canvas and exports it as a
 * JPEG Blob, ready for upload (see utils/storage.ts's uploadAvatar). */
export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D não suportado neste navegador.");
  }

  const { width: boxWidth, height: boxHeight } = rotatedSize(
    image.width,
    image.height,
    rotation,
  );
  canvas.width = boxWidth;
  canvas.height = boxHeight;

  ctx.translate(boxWidth / 2, boxHeight / 2);
  ctx.rotate(toRadians(rotation));
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const croppedImageData = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
  );

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.putImageData(croppedImageData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Falha ao gerar a imagem recortada."));
      },
      "image/jpeg",
      0.9,
    );
  });
}
