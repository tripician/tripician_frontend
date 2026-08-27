/**
 * Something a guest typed before they had an account.
 *
 * The generalisation of `pendingNaviaPrompt`, which does the same job for the
 * one surface it was written for, and for the same reasons: sessionStorage
 * because the value has to survive a route change to /signup, an account
 * creation, a second route change to /signin, and on the social path a full
 * document reload out to the identity provider and back to /callback. React
 * state and module scope both die on that reload. localStorage would survive too
 * well, and an unauthenticated draft has no business outliving the tab on a
 * shared machine.
 *
 * It also has to survive `clearSessionData()`, which both sign-in paths call one
 * line BEFORE they store the new token. See PRESERVED_SESSION_KEYS in
 * utils/authSession.ts.
 *
 * Only typed text is kept. A like or a follow is one tap, and restoring one
 * would mean performing an action after a redirect that the person may no longer
 * intend, on a page they may not be looking at.
 */
export const PENDING_DRAFT_KEY = 'tripician:pendingDraft';

/** Older than this and it is a restored tab, not an intent. */
const MAX_AGE_MS = 30 * 60 * 1000;

interface StashedDraft {
  /** Which composer it belongs to, so the wrong one cannot claim it. */
  key: string;
  text: string;
  /** Where the person was, so sign-in can put them back. */
  returnTo: string;
  /** Composer state the text alone cannot carry, such as a chosen mode. */
  meta?: string;
  ts: number;
}

function read(): StashedDraft | null {
  try {
    const raw = sessionStorage.getItem(PENDING_DRAFT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StashedDraft;
    if (typeof parsed?.key !== 'string' || !parsed.key) return null;
    if (typeof parsed?.text !== 'string' || !parsed.text.trim()) return null;

    if (Date.now() - (parsed.ts ?? 0) > MAX_AGE_MS) {
      sessionStorage.removeItem(PENDING_DRAFT_KEY);
      return null;
    }
    return parsed;
  } catch {
    // Private mode, storage disabled, or a hand-edited value. The composer just
    // opens empty, which is survivable.
    return null;
  }
}

/** One draft at a time. A person is doing one thing when they hit the wall. */
export function stashDraft(key: string, text: string, returnTo: string, meta?: string): void {
  const trimmed = text.trim();
  if (!key || !trimmed) return;
  try {
    sessionStorage.setItem(
      PENDING_DRAFT_KEY,
      JSON.stringify({ key, text: trimmed, returnTo, meta, ts: Date.now() } satisfies StashedDraft),
    );
  } catch { /* see read() */ }
}

/** Non-destructive, and only for deciding where to send someone after sign-in. */
export function peekDraftReturnTo(): string | null {
  return read()?.returnTo ?? null;
}

/**
 * Destructive, and destructive first.
 *
 * The callers are composer mount effects, which React StrictMode invokes twice
 * in development. Removing before returning makes a double-restore impossible
 * rather than merely unlikely.
 */
export function takeDraft(key: string): string | null {
  return takeDraftWithMeta(key)?.text ?? null;
}

/** Same contract as takeDraft, for a composer that stashed state beside the text. */
export function takeDraftWithMeta(key: string): { text: string; meta?: string } | null {
  const found = read();
  if (!found) return null;
  // A draft belongs to one composer. Leave someone else's alone rather than
  // dropping it, or opening the wrong page would silently eat their writing.
  if (found.key !== key) return null;
  try { sessionStorage.removeItem(PENDING_DRAFT_KEY); } catch { /* see read() */ }
  return { text: found.text, meta: found.meta };
}

export function clearDraft(): void {
  try { sessionStorage.removeItem(PENDING_DRAFT_KEY); } catch { /* see read() */ }
}

/**
 * Where to land after signing in with a social provider.
 *
 * The email path does not need this: `?next=` is still on the URL when Signin
 * reads it. The social path leaves the site entirely and comes back to
 * /callback with a query string of the provider's choosing, so the only place
 * the destination can survive is storage.
 */
export const PENDING_RETURN_KEY = 'tripician:pendingReturnTo';

export function stashReturnTo(path: string): void {
  // Same open-redirect bar as safeNext: a stored value is no more trustworthy
  // than a query parameter.
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return;
  try {
    sessionStorage.setItem(PENDING_RETURN_KEY, JSON.stringify({ path, ts: Date.now() }));
  } catch { /* see read() */ }
}

export function takeReturnTo(): string | null {
  try {
    const raw = sessionStorage.getItem(PENDING_RETURN_KEY);
    sessionStorage.removeItem(PENDING_RETURN_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { path?: string; ts?: number };
    if (typeof parsed?.path !== 'string' || !parsed.path.startsWith('/')) return null;
    if (Date.now() - (parsed.ts ?? 0) > MAX_AGE_MS) return null;
    return parsed.path;
  } catch {
    return null;
  }
}
