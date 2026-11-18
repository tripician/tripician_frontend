/**
 * Comments a viewer chose to hide, remembered in this browser.
 *
 * Hiding is a personal "I don't want to see this", like Facebook's "Hide
 * comment": nobody else is affected and nothing is sent to the server (the
 * app's hide works the same way, on the device). Reporting and blocking are
 * the actions that reach Tripician.
 *
 * Keyed by the signed-in user, so two people sharing a browser keep their own
 * lists. Storage can be unavailable (private windows, blocked site data), so
 * every access is guarded and a failure simply means nothing is hidden.
 */

const MAX_IDS = 500;
const keyFor = (viewerId?: string | null) => `tripician:hidden-comments:${viewerId || 'guest'}`;

function read(viewerId?: string | null): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(keyFor(viewerId)) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function write(viewerId: string | null | undefined, ids: string[]): void {
  try {
    window.localStorage.setItem(keyFor(viewerId), JSON.stringify(ids.slice(-MAX_IDS)));
  } catch { /* hiding is a convenience; without storage it lasts for this page only */ }
}

export function isCommentHidden(commentId: string, viewerId?: string | null): boolean {
  return read(viewerId).includes(commentId);
}

export function hideComment(commentId: string, viewerId?: string | null): void {
  write(viewerId, [...read(viewerId).filter((id) => id !== commentId), commentId]);
}

export function unhideComment(commentId: string, viewerId?: string | null): void {
  write(viewerId, read(viewerId).filter((id) => id !== commentId));
}
