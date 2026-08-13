import { isLegacyIdToken, isTokenUsable } from '../../utils/authSession';

/**
 * The one answer to "is this user signed in", shared by everything that asks.
 *
 * Why a module store rather than state inside `useAuthToken`: that hook creates its
 * own `useState` per caller, and 24 files call it. While a refresh was in flight,
 * 24 independent copies of "am I valid" would disagree, and the specific way that
 * bites is `GuestRoute` reading `refreshing` as valid while `ProtectedRoute` reads
 * it as expired, which ping-pongs the user between /signin and /home forever.
 *
 * Why not a Redux slice: `store -> slices -> apiServices -> tokenService -> store`
 * is a real import cycle, since `userSlice` and `notificationSlice` already import
 * `apiServices`.
 *
 * The in-memory token is authoritative and localStorage is a mirror, so a private
 * mode or quota write failure degrades to "this session lasts until reload" rather
 * than "the session is gone".
 */

export type SessionStatus =
  /** No stored token. A guest. */
  | 'anonymous'
  /** A token that is present and has life left on it. */
  | 'valid'
  /** A refresh is in flight. Treat as "do not decide yet", never as signed out. */
  | 'refreshing'
  /** A token exists but cannot be sent. Either a refresh has not run yet, or it failed. */
  | 'expired';

/**
 * How the session was established, which decides how it can be renewed.
 * `password` sessions hold an Auth0 refresh token and renew through the backend;
 * `social` sessions renew through the Auth0 SDK. `unknown` covers sessions created
 * before this was recorded, which fall back to trying both.
 */
export type SessionKind = 'password' | 'social' | 'unknown';

export const ACCESS_TOKEN_KEY = 'accessToken';
export const REFRESH_TOKEN_KEY = 'refreshToken';
export const SESSION_KIND_KEY = 'authSessionKind';

export interface SessionSnapshot {
  token: string | null;
  status: SessionStatus;
  kind: SessionKind;
}

function readStorage(key: string): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* private mode or quota: the in-memory copy still holds */ }
}

function readKind(): SessionKind {
  const raw = readStorage(SESSION_KIND_KEY);
  return raw === 'password' || raw === 'social' ? raw : 'unknown';
}

/**
 * A stored token is `valid` only if it can actually be sent. A legacy Auth0 ID
 * token counts as expired even when its `exp` is in the future, which is what makes
 * anyone still holding one migrate to a real access token on their next request.
 */
function deriveStatus(token: string | null): SessionStatus {
  if (!token) return 'anonymous';
  if (isLegacyIdToken(token)) return 'expired';
  return isTokenUsable(token) ? 'valid' : 'expired';
}

/*
 * Initialised synchronously at module load, deliberately.
 *
 * `useAuthToken` used to start at `loading: true` and resolve inside an effect,
 * which is what made the route guards flash a loader on every navigation for users
 * who were plainly signed in. Reading localStorage is synchronous, so there is no
 * reason to make callers wait for it.
 */
let snapshot: SessionSnapshot = (() => {
  const token = readStorage(ACCESS_TOKEN_KEY);
  return { token, status: deriveStatus(token), kind: readKind() };
})();

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    try { listener(); } catch (e) { console.error('[sessionStatus] listener threw', e); }
  }
}

/** For `useSyncExternalStore`. Returns a stable object between changes. */
export function getSnapshot(): SessionSnapshot {
  return snapshot;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function set(next: SessionSnapshot): void {
  if (
    next.token === snapshot.token
    && next.status === snapshot.status
    && next.kind === snapshot.kind
  ) {
    return; // no-op writes must not re-render 24 subscribers
  }
  snapshot = next;
  emit();
}

/** Adopt a new access token: mirror it to storage and re-derive the status. */
export function setAccessToken(token: string | null, kind?: SessionKind): void {
  writeStorage(ACCESS_TOKEN_KEY, token);
  const nextKind = kind ?? snapshot.kind;
  if (kind) writeStorage(SESSION_KIND_KEY, kind);
  set({ token, status: deriveStatus(token), kind: nextKind });
}

/**
 * Stored ahead of the access token on every refresh. Rotation makes refresh tokens
 * single-use, so losing the replacement means the next refresh is rejected and the
 * user is signed out.
 */
export function setRefreshToken(token: string | null): void {
  writeStorage(REFRESH_TOKEN_KEY, token);
}

export function getRefreshToken(): string | null {
  return readStorage(REFRESH_TOKEN_KEY);
}

export function markRefreshing(): void {
  if (snapshot.status === 'refreshing') return;
  set({ ...snapshot, status: 'refreshing' });
}

/** Back to a settled state after a refresh that produced nothing usable. */
export function markExpired(): void {
  set({ ...snapshot, status: snapshot.token ? 'expired' : 'anonymous' });
}

export function markAnonymous(): void {
  set({ token: null, status: 'anonymous', kind: 'unknown' });
}

/** Re-read storage. Used after another tab refreshed, and after a cross-tab lock. */
export function resyncFromStorage(): void {
  const token = readStorage(ACCESS_TOKEN_KEY);
  set({ token, status: deriveStatus(token), kind: readKind() });
}

/*
 * Multi-tab sync. This used to live inside `useAuthToken`, where every one of its
 * callers registered its own listener; one listener for the whole app is enough.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === ACCESS_TOKEN_KEY || e.key === null) resyncFromStorage();
  });
}
