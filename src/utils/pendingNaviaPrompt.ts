/**
 * The prompt a visitor typed into the landing hero before they had an account.
 *
 * Navia cannot answer a guest - `NaviaController` is `[Authorize]` at the class
 * level with no anonymous action - so the landing page does not pretend to. It
 * captures the intent, parks it somewhere a page reload cannot reach, and hands
 * the visitor to sign-up. `NaviaPage` replays it on the other side.
 *
 * Why sessionStorage specifically. The prompt has to survive a route change to
 * /signup, an account creation, a second route change to /signin (Signup.tsx
 * navigates there, not to /home) and - on the social path - a full page reload
 * out to Auth0 and back to /callback. React state and module scope both die on
 * that reload. localStorage would survive too well: an unauthenticated intent
 * has no business outliving the tab on a shared machine.
 *
 * It also has to survive `clearSessionData()`, which both sign-in paths call
 * one line BEFORE they store the new token. See PRESERVED_SESSION_KEYS in
 * utils/authSession.ts - without that exception this is destroyed by the very
 * sign-in it exists to feed.
 */
export const PENDING_NAVIA_PROMPT_KEY = 'tripician:pendingNaviaPrompt';

/** Older than this and it is a restored tab, not an intent. Don't ambush the user. */
const MAX_AGE_MS = 30 * 60 * 1000;

interface StashedPrompt {
  prompt: string;
  ts: number;
}

function read(): StashedPrompt | null {
  try {
    const raw = sessionStorage.getItem(PENDING_NAVIA_PROMPT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StashedPrompt;
    if (typeof parsed?.prompt !== 'string' || !parsed.prompt.trim()) return null;

    if (Date.now() - (parsed.ts ?? 0) > MAX_AGE_MS) {
      sessionStorage.removeItem(PENDING_NAVIA_PROMPT_KEY);
      return null;
    }
    return parsed;
  } catch {
    // Private mode, storage disabled, or a hand-edited value. The visitor just
    // lands on an empty /navia, which is survivable.
    return null;
  }
}

export function stashPendingPrompt(prompt: string): void {
  const trimmed = prompt.trim();
  if (!trimmed) return;
  try {
    sessionStorage.setItem(
      PENDING_NAVIA_PROMPT_KEY,
      JSON.stringify({ prompt: trimmed, ts: Date.now() } satisfies StashedPrompt),
    );
  } catch { /* see read() */ }
}

/** Non-destructive. Used by the auth redirects purely to decide WHERE to go. */
export function peekPendingPrompt(): string | null {
  return read()?.prompt ?? null;
}

/**
 * Destructive, and destructive FIRST.
 *
 * The caller is NaviaPage's replay effect, which React StrictMode invokes twice
 * in development. Removing before returning makes a double-send impossible
 * rather than merely unlikely.
 */
export function takePendingPrompt(): string | null {
  const found = read();
  try { sessionStorage.removeItem(PENDING_NAVIA_PROMPT_KEY); } catch { /* see read() */ }
  return found?.prompt ?? null;
}
