import { clearSessionData, isTokenUsable } from '../../utils/authSession';
import { getSilentTokenFn } from './auth0Bridge';
import {
  getRefreshToken,
  getSnapshot,
  markAnonymous,
  markExpired,
  markRefreshing,
  resyncFromStorage,
  setAccessToken,
  setRefreshToken,
  type SessionKind,
} from './sessionStatus';

/**
 * Keeping a signed-in user signed in.
 *
 * Before this existed the app held a bearer token with a fixed lifetime and had no
 * way to renew it and no code that noticed it had expired. Once it lapsed the shell
 * still looked signed in, every panel 401'd, chat and notifications died silently,
 * and `GuestRoute` would not even let the user reach /signin to fix it.
 *
 * ## The invariant that matters most
 *
 * **This module never authenticates from the Auth0 session cookie alone.**
 * `getFreshToken()` renews an EXISTING local session and returns null when there is
 * no stored token. It never calls `loginWithRedirect`. Only the sign-in page starts
 * an interactive login.
 *
 * That is not a stylistic preference. The production back-button loop happened
 * because one component treated "the IdP says yes" as "the user is signed in" while
 * the guards read localStorage. Anything that re-authenticates from the cookie
 * re-opens that class of bug, so it is ruled out here by construction.
 *
 * ## Two kinds of session
 *
 * Email/password sign-in goes through the backend, which mints via its confidential
 * Auth0 client and returns a refresh token that only it can redeem, so those renew
 * through `POST /auth/refresh`. Google sign-in establishes an Auth0 SDK session, so
 * those renew through `getAccessTokenSilently()`. The kind is recorded at sign-in;
 * sessions predating that try the other strategy before giving up, which is what
 * migrates today's live sessions without anyone noticing.
 */

/** Never sign out over a network blip. Callers get null and retry on the next action. */
type RefreshOutcome =
  | { kind: 'ok'; token: string }
  /** The credential itself was rejected. Signing in again is the only fix. */
  | { kind: 'rejected' }
  /** Transient: server error, timeout, offline. The stored token is left alone. */
  | { kind: 'unavailable' };

let inFlight: Promise<string | null> | null = null;
let signOutFired = false;

const REFRESH_LOCK = 'tripician:token-refresh';

/**
 * A valid access token, refreshing first if the stored one cannot be sent.
 *
 * Returns null for a guest, and null when a refresh could not produce one. Callers
 * must treat null as "make this request without auth, or do not make it" and never
 * as "log the user out": that decision is made here, once.
 */
export async function getFreshToken(options?: { force?: boolean }): Promise<string | null> {
  const { token } = getSnapshot();

  // A guest. No network call, no interactive login, no latency for public browsing.
  if (!token) return null;

  if (!options?.force && getSnapshot().status === 'valid') return token;

  // One refresh, however many callers. A page mount fires a dozen requests at once.
  if (inFlight) return inFlight;

  inFlight = runRefresh().finally(() => { inFlight = null; });
  return inFlight;
}

async function runRefresh(): Promise<string | null> {
  markRefreshing();

  const outcome = await withCrossTabLock(async () => {
    /*
     * Another tab may have refreshed while we waited for the lock. Adopting its
     * result rather than redeeming again is what stops two tabs waking together
     * from both spending the refresh token: with rotation on, the second redemption
     * is a reuse collision and Auth0 revokes the whole family, signing the user out
     * of every tab.
     */
    resyncFromStorage();
    const current = getSnapshot();
    if (current.token && isTokenUsable(current.token) && current.status === 'valid') {
      return { kind: 'ok', token: current.token } as RefreshOutcome;
    }
    return attemptRefresh(current.kind);
  });

  if (outcome.kind === 'ok') return outcome.token;

  if (outcome.kind === 'unavailable') {
    // Leave the stored token in place. It may be fine and the network may not be,
    // and blindly retrying is exactly what trips reuse detection.
    markExpired();
    return null;
  }

  forceSignOut('token_expired');
  return null;
}

/**
 * Tries the strategy the session was created with, then the other one.
 *
 * The fallback is safe under rotation because the two strategies use different
 * credentials, so it is not a retry of a token that may already have been spent.
 * It exists for sessions created before the kind was recorded, so they migrate
 * without anyone being signed out for guessing wrong.
 *
 * The fallback can only ever RESCUE, never soften. If the session's own strategy
 * says the credential is void and the fallback merely could not run, the verdict
 * stands and the session ends. Letting "could not run" downgrade a definite
 * rejection would leave a genuinely dead session sitting in `expired` with no exit,
 * which is the trap this whole layer exists to remove.
 */
async function attemptRefresh(kind: SessionKind): Promise<RefreshOutcome> {
  const hasRefreshToken = Boolean(getRefreshToken());
  const preferPassword = kind === 'password' || (kind === 'unknown' && hasRefreshToken);

  const primary = preferPassword ? refreshViaBackend : refreshViaAuth0;
  const secondary = preferPassword ? refreshViaAuth0 : refreshViaBackend;

  const first = await primary();
  // 'unavailable' from the session's own strategy is the network case: stop here and
  // leave the stored credential alone rather than spending the other one.
  if (first.kind === 'ok' || first.kind === 'unavailable') return first;

  const second = await secondary();
  return second.kind === 'ok' ? second : first;
}

/** Password sessions: the backend redeems the refresh token with its own client. */
async function refreshViaBackend(): Promise<RefreshOutcome> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return { kind: 'rejected' };

  try {
    // Imported lazily to keep this module out of the auth client's import graph.
    const { authAPI } = await import('../APIs/Auth/auth');
    const response = await authAPI.refresh(refreshToken);
    const data = response?.data;
    if (!data?.accessToken) return { kind: 'rejected' };

    /*
     * Rotation is single-use, so the replacement is stored BEFORE the access token
     * and before anyone can act on it. Getting this order wrong means a later
     * refresh redeems a spent token, Auth0 revokes the family, and the user is
     * signed out for no reason they can see.
     */
    if (data.refreshToken) setRefreshToken(data.refreshToken);
    setAccessToken(data.accessToken, 'password');
    return { kind: 'ok', token: data.accessToken };
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 401 || status === 400) return { kind: 'rejected' };
    // 5xx, offline, timeout: the credential may well still be good.
    return { kind: 'unavailable' };
  }
}

/** Social sessions: the SDK holds the refresh token and does the work. */
async function refreshViaAuth0(): Promise<RefreshOutcome> {
  const silentToken = getSilentTokenFn();
  // 'unavailable', not 'rejected'. An unwired bridge means the SDK has not mounted
  // yet (or failed to initialise), which says nothing about the credential. Calling
  // it a rejection would let a startup race cascade into signing out every social
  // user, since their strategy is the only one they have.
  if (!silentToken) return { kind: 'unavailable' };

  try {
    const token = await silentToken();
    if (!token) return { kind: 'rejected' };
    setAccessToken(token, 'social');
    return { kind: 'ok', token };
  } catch (err) {
    const code = (err as { error?: string })?.error;
    if (
      code === 'login_required'
      || code === 'consent_required'
      || code === 'missing_refresh_token'
      || code === 'invalid_grant'
    ) {
      return { kind: 'rejected' };
    }
    // Includes `timeout` and network failures.
    return { kind: 'unavailable' };
  }
}

/**
 * Serialises refreshes across tabs where the Web Locks API exists, and runs
 * straight through where it does not (Safari before 15.4). The re-read inside the
 * lock is what makes the lock worth taking.
 */
async function withCrossTabLock(fn: () => Promise<RefreshOutcome>): Promise<RefreshOutcome> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  if (!locks?.request) return fn();
  try {
    return await locks.request(REFRESH_LOCK, fn);
  } catch {
    // A lock failure must not become a sign-out.
    return fn();
  }
}

/**
 * End the session because the credential is gone, not because the user asked.
 *
 * One-shot: forty simultaneous 401s produce one redirect, not forty. A full page
 * navigation rather than a router push, so SignalR connections and any in-flight
 * request holding the dead token are torn down with it.
 *
 * Deliberately does NOT call Auth0 `logout()`. There is no stored token afterwards
 * and this module never authenticates from the cookie alone, so nothing can
 * re-authenticate; skipping the federated round trip means an expired session costs
 * the user one click instead of a redirect chain. Explicit sign-out is different
 * and does end the IdP session, see signOut.ts.
 */
export function forceSignOut(reason: 'token_expired' | 'account_deleted' = 'token_expired'): void {
  if (signOutFired) return;
  signOutFired = true;

  try { clearSessionData(); } catch (e) { console.error('[tokenService] teardown failed', e); }
  markAnonymous();

  // Kept for the existing listeners (authDebug, and useAuthToken's own handler).
  try {
    window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason } }));
  } catch { /* non-fatal */ }

  try {
    window.location.assign('/signin?expired=1');
  } catch { /* nothing left to try */ }
}

/** Test seam. Never call this from app code. */
export function __resetTokenServiceForTests(): void {
  inFlight = null;
  signOutFired = false;
}
