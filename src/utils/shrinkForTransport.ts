// Shrinks a photo in the browser only when it would not survive the trip to our server (Cloudflare
// refuses a request over 10 MB). The server still enforces the real rules on whatever arrives; this
// only keeps the request deliverable, so it is invisible unless the original file is unusually large.

const TRANSPORT_SAFE_BYTES = 9 * 1024 * 1024;
const TRANSPORT_LONG_SIDE = 3200;
const TRANSPORT_MIN_SHORT_SIDE = 1200;
const QUALITY_STEPS = [0.85, 0.75, 0.65, 0.55, 0.45];

export async function shrinkForTransport(file: File): Promise<File> {
  if (file.size <= TRANSPORT_SAFE_BYTES) return file;
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  if (typeof createImageBitmap !== 'function') return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    try {
      return await shrinkBitmap(bitmap, file);
    } finally {
      bitmap.close();
    }
  } catch {
    // Any decode or canvas failure falls back to the original file. This step is an optimisation,
    // never a gate, so a photo the browser cannot touch still reaches the server as it was.
    return file;
  }
}

async function shrinkBitmap(bitmap: ImageBitmap, original: File): Promise<File> {
  let scale = Math.min(1, TRANSPORT_LONG_SIDE / Math.max(bitmap.width, bitmap.height));
  let last: Blob | null = null;

  for (let attempt = 0; attempt < 8; attempt++) {
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const blob = await encodeAt(bitmap, width, height);
    if (blob) last = blob;
    if (blob && blob.size <= TRANSPORT_SAFE_BYTES) {
      return new File([blob], original.name, { type: 'image/jpeg' });
    }
    if (Math.min(width, height) <= TRANSPORT_MIN_SHORT_SIDE) break;
    scale *= 0.85;
  }

  // Could not reach the target: send the smallest version produced, which still beats the original.
  return last ? new File([last], original.name, { type: 'image/jpeg' }) : original;
}

async function encodeAt(bitmap: ImageBitmap, width: number, height: number): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, width, height);

  let smallest: Blob | null = null;
  for (const quality of QUALITY_STEPS) {
    const blob = await toBlob(canvas, quality);
    if (!blob) continue;
    smallest = blob;
    if (blob.size <= TRANSPORT_SAFE_BYTES) return blob;
  }
  return smallest;
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}
