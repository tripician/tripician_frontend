/**
 * Shrinks a picture in the browser and hands back a base64 data URL.
 *
 * Screenshots go to the model inside the request body rather than through
 * Cloudinary, because a chat screenshot carries other people's messages and we
 * do not want to keep those. That choice has a cost: a phone screenshot is
 * several megabytes and five of them will not fit in one request, so they have
 * to be made smaller here, before they are sent.
 *
 * A long edge of 1600px is the trade. Text in a screenshot stays legible at that
 * size, which is the whole point, while the file lands in the low hundreds of
 * kilobytes.
 */

const MAX_EDGE = 1600;
const QUALITY = 0.82;

export class DownscaleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DownscaleError';
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new DownscaleError('That image could not be read.')); };
    img.src = url;
  });
}

export async function downscaleImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new DownscaleError('Only images can be read.');
  }

  const img = await loadImage(file);
  const { naturalWidth: w, naturalHeight: h } = img;
  if (!w || !h) throw new DownscaleError('That image could not be read.');

  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new DownscaleError('That image could not be read.');

  // White behind everything: a screenshot saved as PNG with transparency would
  // otherwise composite onto black and take its text with it.
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
  if (!dataUrl.startsWith('data:image/')) throw new DownscaleError('That image could not be read.');
  return dataUrl;
}
