// A square, compressed version of an image for dense grids, using each host's own resize parameters; unknown hosts pass through.

const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/;

export function squareThumb(url: string | null | undefined, size: number): string | null {
  if (typeof url !== 'string' || !url.trim()) return null;
  const src = url.trim();
  const px = Math.max(1, Math.round(size));

  const cloudinary = CLOUDINARY_UPLOAD.exec(src);
  if (cloudinary) {
    const [, base, rest] = cloudinary;
    // An existing transformation segment (anything with an underscore before the version) is left as the uploader set it.
    const firstSegment = rest.split('/')[0] ?? '';
    if (/^[a-z]{1,3}_/.test(firstSegment)) return src;
    return `${base}c_fill,g_auto,w_${px},h_${px},f_auto,q_auto/${rest}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(src);
  } catch {
    return src;
  }

  if (parsed.hostname === 'images.pexels.com') {
    parsed.searchParams.set('auto', 'compress');
    parsed.searchParams.set('cs', 'tinysrgb');
    parsed.searchParams.set('fit', 'crop');
    parsed.searchParams.set('w', String(px));
    parsed.searchParams.set('h', String(px));
    return parsed.toString();
  }

  if (parsed.hostname === 'images.unsplash.com') {
    parsed.searchParams.set('fit', 'crop');
    parsed.searchParams.set('w', String(px));
    parsed.searchParams.set('h', String(px));
    parsed.searchParams.set('q', '70');
    return parsed.toString();
  }

  return src;
}

/**
 * A Cloudinary image no wider than `width`, in the browser's best format and an
 * automatic quality, never cropped and never scaled up. Other hosts, and a URL
 * that already carries a transformation, pass through unchanged.
 *
 * Story photos used to load the original upload: a 1.5 MB PNG that Cloudinary
 * serves at about 60 KB this way, which is the difference between a picture and
 * a long empty placeholder on a phone.
 */
export function fitWidth(url: string | null | undefined, width: number): string | null {
  if (typeof url !== 'string' || !url.trim()) return null;
  const src = url.trim();
  const cloudinary = CLOUDINARY_UPLOAD.exec(src);
  if (!cloudinary) return src;
  const [, base, rest] = cloudinary;
  const firstSegment = rest.split('/')[0] ?? '';
  if (/^[a-z]{1,3}_/.test(firstSegment)) return src;
  return `${base}c_limit,w_${Math.max(1, Math.round(width))},f_auto,q_auto/${rest}`;
}
