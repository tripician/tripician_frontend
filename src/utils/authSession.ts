/**
 * One place that ends a session, and one rule for who cached data belongs to.
 *
 * Why this exists: sign-out and delete-account were implemented five separate
 * times (useAuth0Token.logout, the `auth:logout` listener, AppShellHeader,
 * TopBar, Dashboard, PrivacySettings) and each cleared a different subset of
 * storage. Delete-account cleared only the two token keys, so `userProfile` -
 * the previous account's name, email and avatar - survived into the next
 * sign-in and was rendered in the header while Settings showed the new user.
 * That is one account's PII displayed inside another account's session.
 *
 * Two defences, because either alone can be defeated by a future call site
 * forgetting to do the right thing:
 *
 *  1. `clearSessionData()` - the single teardown every exit path calls. It is
 *     DEFAULT-DENY: it removes everything except an explicit allowlist of
 *     non-personal device preferences. New per-user keys are therefore wiped
 *     automatically rather than leaking until someone remembers to add them.
 *
 *  2. `tokenSubject()` - lets cached data be tagged with the account it came
 *     from, so a cache written by account A can never be read into a session
 *     for account B even if teardown was skipped entirely.
 */

/**
 * Keys that survive teardown: device/browser preferences with no personal data.
 * Everything not listed here is treated as user data and removed. Add to this
 * list only for values that would be harmless in a stranger's hands.
 */
const DEVICE_PREFERENCE_KEYS: readonly string[] = [
  'tripician:onboardingSeen',
  'tripician:feedbackPromptShown',
  'tripician:mobilePlannerNoticeAck',
];

/** Same rule, for families of keys. `unsplash_v1_*` is a public image-URL cache. */
const DEVICE_PREFERENCE_PREFIXES: readonly string[] = [
  'unsplash_v1_',
];

/**
 * sessionStorage keys that survive teardown.
 *
 * This is not user data leaking across accounts - it is an intent the visitor
 * expressed BEFORE they had an account (the prompt typed into the landing
 * hero), and it is the reason the sign-up they are completing right now
 * exists. Both sign-in paths call clearSessionData() immediately before storing
 * the new token, so without this the prompt is destroyed one line ahead of the
 * redirect meant to carry it.
 *
 * Same bar as DEVICE_PREFERENCE_KEYS: add a key here only if it would be
 * harmless in a stranger's hands. A trip prompt is; a chat transcript is not,
 * which is why `navia-chat-*` is still wiped below.
 */
const PRESERVED_SESSION_KEYS: readonly string[] = [
  'tripician:pendingNaviaPrompt',
];

function isDevicePreference(key: string): boolean {
  return DEVICE_PREFERENCE_KEYS.includes(key)
    || DEVICE_PREFERENCE_PREFIXES.some((prefix) => key.startsWith(prefix));
}

/** Storage access is wrapped everywhere: private mode and SSR both make it throw. */
function safeLocalStorage(): Storage | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}

function safeSessionStorage(): Storage | null {
  try { return typeof sessionStorage === 'undefined' ? null : sessionStorage; } catch { return null; }
}

/**
 * Wipes every trace of the signed-in account from this browser: tokens, the
 * cached profile, and all app data written under that account (documents,
 * packing lists, draft trip ids, risk-monitor history, Navia chat transcripts).
 *
 * Call this on sign-out, on account deletion, and on forced logout. It is
 * deliberately safe to call twice.
 */
export function clearSessionData(): void {
  const local = safeLocalStorage();
  if (local) {
    try {
      // Snapshot the keys first - removing while iterating re-indexes the store
      // and silently skips entries.
      const keys: string[] = [];
      for (let i = 0; i < local.length; i++) {
        const key = local.key(i);
        if (key !== null) keys.push(key);
      }
      for (const key of keys) {
        if (!isDevicePreference(key)) local.removeItem(key);
      }
    } catch { /* nothing more we can do; the session ends regardless */ }
  }

  // Navia chat transcripts live here (`navia-chat-*`) and are per-account, so
  // the default is still a full clear - the allowlist is lifted out and put back.
  const session = safeSessionStorage();
  if (session) {
    try {
      const preserved = PRESERVED_SESSION_KEYS
        .map((key) => [key, session.getItem(key)] as const)
        .filter((entry): entry is readonly [string, string] => entry[1] !== null);

      session.clear();

      for (const [key, value] of preserved) session.setItem(key, value);
    } catch { /* as above */ }
  }
}

/**
 * The account a token belongs to, taken from its `sub` claim.
 *
 * Decoded, never verified: this is used purely to partition client-side caches
 * per account. The server remains the only thing that authorises a token, so a
 * forged value here buys an attacker nothing but a cache miss.
 *
 * Returns null for a missing or unreadable token, which callers must treat as
 * "no usable cache" rather than "any cache will do".
 */
export function tokenSubject(token?: string | null): string | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const claims = JSON.parse(atob(padded));

    // `sub` is what Auth0 issues and what the backend authorises on; the rest
    // are fallbacks for tokens shaped by .NET's claim remapping.
    const subject = claims.sub
      ?? claims.nameid
      ?? claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];

    return typeof subject === 'string' && subject.trim() ? subject.trim() : null;
  } catch {
    return null;
  }
}
