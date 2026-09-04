/**
 * Turns a Cloudinary upload rejection into something a traveller can act on.
 *
 * This exists because the previous handler was `catch { throw 'That image could
 * not be uploaded. Try a different one.' }`, which said the same thing whether
 * the file was 30MB, a HEIC from an iPhone, or a signature that had gone stale
 * while the tab sat open. Cloudinary always explains itself in
 * `{ error: { message } }`; the bug was that we threw the explanation away.
 *
 * The fallback is the raw Cloudinary message rather than a generic line. An
 * unmapped reason is still a reason, and a sentence the traveller can paste into
 * a support message beats a shrug. The mapped cases only exist to replace
 * Cloudinary's API-facing phrasing with something addressed to a person.
 */

import { STORY_MEDIA_MAX_BYTES } from './types';

const MAX_MB = Math.round(STORY_MEDIA_MAX_BYTES / 1024 / 1024);

/**
 * Ordered because the first match wins and some Cloudinary strings overlap:
 * "Invalid Signature" and "Invalid image file" both contain "Invalid".
 */
const RULES: Array<{ match: RegExp; say: string }> = [
  {
    match: /file size too large|larger than.*bytes|maximum.*file size/i,
    say: `That image is too large. The limit is ${MAX_MB}MB.`,
  },
  {
    match: /invalid signature|stale request|signature.*expired/i,
    say: 'That upload link expired. Try adding the photo again.',
  },
  {
    match: /is not allowed|not an allowed format|invalid image file|unsupported (file|image|format)/i,
    say: 'That file type is not supported. Use a JPG, PNG, WEBP, GIF or AVIF.',
  },
  {
    match: /rate limit|too many requests/i,
    say: 'Too many uploads at once. Wait a moment and try again.',
  },
];

/**
 * @param cloudinaryMessage the string from `error.message` on the response body,
 *   when there was a response body at all.
 * @param hadResponse false when the request never reached Cloudinary, which is a
 *   connection problem and not a problem with the file.
 */
export function explainUploadFailure(
  cloudinaryMessage: string | undefined,
  hadResponse: boolean,
): string {
  if (!hadResponse) {
    return 'Could not reach the image server. Check your connection and try again.';
  }

  const message = cloudinaryMessage?.trim();
  if (!message) {
    return 'The image server rejected that upload without saying why. Try a different photo.';
  }

  const rule = RULES.find((r) => r.match.test(message));
  if (rule) return rule.say;

  // Verbatim, only capitalised and stopped, so it reads as a sentence next to
  // the mapped ones.
  const first = message.charAt(0).toUpperCase() + message.slice(1);
  return /[.!?]$/.test(first) ? first : `${first}.`;
}
