/**
 * Relative and absolute time, for card chrome.
 *
 * Lifted out of `pages/ProfilePage/tripViewModel` once every trip card started
 * showing an age: a component in `components/ui` must not import from a page,
 * and a second copy of "5d ago" would drift the moment one of them was tuned.
 * `tripViewModel` re-exports `formatRelativeTime` so its callers and its tests
 * are unaffected.
 */

/** "3d ago". Empty string when there is no usable date, never "Invalid Date". */
export function formatRelativeTime(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return '';

  const seconds = Math.floor((Date.now() - then.getTime()) / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  return `${Math.floor(months / 12)}y ago`;
}

/**
 * "16 Nov 2026, 14:30". The exact reading behind a relative one, for tooltips.
 *
 * A card says "5d ago" because that is what a reader actually wants at a glance,
 * but "5d" is useless when someone needs to know which of two edits came first.
 * Empty string for junk, so a caller can drop the tooltip entirely.
 */
export function formatAbsoluteDateTime(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
