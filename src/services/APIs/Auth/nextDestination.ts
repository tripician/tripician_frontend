/**
 * Where to send someone once they are signed in.
 *
 * Carried as `?next=` through /signin and /signup, so a call to action anywhere
 * can send a guest away and get them back. There was no such mechanism before:
 * Signup hardcoded a hop to /signin and forgot everything the visitor had asked
 * for, which is why the business front door could not exist.
 */

const FALLBACK = '/home';

/**
 * Same-origin, absolute, single-slash paths only.
 *
 * Rejecting `//evil.com` matters: the browser reads a protocol-relative URL as
 * another host, so an unchecked `next` is an open redirect with our name on it.
 */
export function safeNext(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith('/')) return null;
  if (value.startsWith('//')) return null;
  if (value.includes('\\')) return null;
  return value;
}

/** Reads `next` off a query string and falls back to /home. */
export function nextFrom(search: string | URLSearchParams): string {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  return safeNext(params.get('next')) ?? FALLBACK;
}

/** Appends `next` to an auth path, leaving it alone when there is nothing to carry. */
export function withNext(path: string, next: string | null | undefined): string {
  const safe = safeNext(next);
  return safe ? `${path}?next=${encodeURIComponent(safe)}` : path;
}
