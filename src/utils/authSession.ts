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
  // "I have already been shown the planner tour" - a bare flag, no trip or user in
  // it, and re-running a walkthrough at someone who has seen it is a worse
  // outcome than the flag persisting.
  'tripician:plannerTourSeen',
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

/**
 * Where the Auth0 SDK keeps its own cache under `cacheLocation: 'localstorage'`.
 * Keys look like `@@auth0spajs@@::<clientId>::<audience>::<scope>`.
 *
 * This is NOT a device preference and must not be added to the allowlist above:
 * it holds the refresh token, so a stranger getting hold of it is exactly the
 * thing sign-out exists to prevent. It is preserved only at the one call site
 * that needs it, via the option below.
 */
const AUTH0_CACHE_PREFIX = '@@auth0spajs@@';

export interface ClearSessionOptions {
  /**
   * Keep the Auth0 SDK's own cache, which holds the refresh token.
   *
   * Exactly one caller wants this: the `/callback` page, which wipes the previous
   * account's data immediately AFTER the SDK has cached the session it just
   * established. Without this flag that wipe deletes the refresh token three lines
   * before the access token is stored, and silent refresh then works in Chrome
   * (which can fall back to a hidden iframe) while failing in Safari and Firefox,
   * which is the worst way for this to break.
   *
   * Sign-out and account deletion must NEVER pass it. A cleared local session that
   * leaves a live refresh token behind is not a sign-out.
   */
  preserveAuth0Cache?: boolean;
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
export function clearSessionData(options?: ClearSessionOptions): void {
  const keepAuth0Cache = options?.preserveAuth0Cache === true;

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
        if (isDevicePreference(key)) continue;
        if (keepAuth0Cache && key.startsWith(AUTH0_CACHE_PREFIX)) continue;
        local.removeItem(key);
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
  const claims = decodeTokenClaims(token);
  if (!claims) return null;

  // `sub` is what Auth0 issues and what the backend authorises on; the rest
  // are fallbacks for tokens shaped by .NET's claim remapping.
  const subject = claims.sub
    ?? claims.nameid
    ?? claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];

  return typeof subject === 'string' && subject.trim() ? subject.trim() : null;
}

/**
 * A JWT's payload claims. Decoded, never verified, same caveat as above: nothing
 * here authorises anything, the server does that.
 *
 * Lifted out of `tokenSubject` when the session layer needed `exp` as well as
 * `sub`. Returns null for anything unreadable rather than throwing, because every
 * caller's correct response to "cannot read this token" is the same.
 */
export function decodeTokenClaims(token?: string | null): Record<string, unknown> | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const claims = JSON.parse(atob(padded));

    return claims && typeof claims === 'object' ? claims as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

/** Milliseconds since epoch at which the token expires, or null if it says nothing. */
export function tokenExpiresAtMs(token?: string | null): number | null {
  const claims = decodeTokenClaims(token);
  const exp = claims?.exp;
  return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1000 : null;
}

/**
 * Default skew when deciding whether a token is still worth sending, in seconds.
 *
 * Matched deliberately to the server's `ClockSkew` (2 minutes, set in
 * Auth0JwtConfiguration.cs). Anything this function calls usable is therefore
 * still accepted by the server for the whole life of the request, rather than
 * expiring somewhere between the check and the response.
 */
export const TOKEN_SKEW_SECONDS = 120;

/**
 * Can this token still be sent?
 *
 * **A token we cannot read returns `false`**, meaning "refresh it", never "sign
 * the user out". That asymmetry is the whole point: a bug in the decoder should
 * cost one wasted refresh round-trip, not log out every user at once.
 */
export function isTokenUsable(token?: string | null, skewSeconds: number = TOKEN_SKEW_SECONDS): boolean {
  if (!token) return false;
  const expiresAt = tokenExpiresAtMs(token);
  if (expiresAt === null) return false;
  return expiresAt - skewSeconds * 1000 > Date.now();
}

/**
 * Is this one of the Auth0 **ID** tokens the Google sign-in path used to store as
 * an API credential?
 *
 * The old `/callback` flow sent `getIdTokenClaims().__raw` to the backend, which
 * echoed it back, and it worked as a bearer token only because the Auth0 client id
 * was listed as a valid audience. Treating those as unusable is what silently
 * migrates anyone still holding one: their next request refreshes into a real
 * access token for the API audience.
 *
 * Deliberately narrow. It asks "is the audience the client id", not "is the
 * audience the expected API", because an environment variable that disagreed with
 * the deployed backend would then lock out every user at once.
 */
export function isLegacyIdToken(token?: string | null): boolean {
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  if (!clientId) return false;
  const aud = decodeTokenClaims(token)?.aud;
  if (typeof aud === 'string') return aud === clientId;
  // ID tokens sometimes carry an array audience.
  if (Array.isArray(aud)) return aud.includes(clientId);
  return false;
}
