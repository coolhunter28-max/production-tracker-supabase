export const QC_IMAGE_MAX_BYTES = 15 * 1024 * 1024;

export const QC_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

type QcImageMime = (typeof QC_IMAGE_MIME_TYPES)[number];

const EXTENSIONS: Record<QcImageMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function validateQcImageMetadata(file: File): string | null {
  if (!QC_IMAGE_MIME_TYPES.includes(file.type as QcImageMime)) {
    return "Formato no permitido. Usa JPG, PNG o WEBP.";
  }

  if (file.size <= 0) return "La imagen está vacía.";
  if (file.size > QC_IMAGE_MAX_BYTES) {
    return "Imagen demasiado grande. Máximo 15 MB.";
  }

  return null;
}

export function hasValidQcImageSignature(
  bytes: Uint8Array,
  mime: string
): boolean {
  if (mime === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (mime === "image/png") {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return bytes.length >= png.length && png.every((value, index) => bytes[index] === value);
  }

  if (mime === "image/webp") {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }

  return false;
}

export function qcImageExtension(mime: string): string {
  return EXTENSIONS[mime as QcImageMime] ?? "bin";
}
