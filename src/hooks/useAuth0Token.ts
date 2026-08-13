import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { clearSessionData } from '../utils/authSession';
import {
  getSnapshot,
  setAccessToken,
  setRefreshToken,
  subscribe,
  type SessionKind,
  type SessionStatus,
} from '../services/auth/sessionStatus';
import { getFreshToken } from '../services/auth/tokenService';
import { signOut } from '../services/auth/signOut';

/**
 * The session, as React sees it.
 *
 * This used to own the state: `useState` seeded from `localStorage.accessToken`,
 * with `isAuthenticated = !!token`. Two problems with that, both now fixed here.
 *
 * 1. **Presence is not validity.** A token string sitting in storage says nothing
 *    about whether it still works, so an expired session looked signed in, every
 *    request 401'd, and `GuestRoute` would not even let the user reach /signin.
 *    `status` now comes from the token's own `exp`.
 * 2. **There was no shared state.** 24 files call this hook and each got its own
 *    `useState`, so during a refresh 24 copies would disagree. They now all read one
 *    module store through `useSyncExternalStore`.
 *
 * The return shape is unchanged apart from additions, which is what let all 24
 * callers keep working untouched.
 */

interface UseAuthTokenResult {
  /** True while a usable token exists, and while one is being renewed. */
  isAuthenticated: boolean;
  /** The stored access token. May be expired; prefer `getFreshToken` for requests. */
  token: string | null;
  /** True only while a refresh is in flight. Guards show a loader on this. */
  loading: boolean;
  /** The full four-state session status, for callers that need to tell them apart. */
  status: SessionStatus;
  kind: SessionKind;
  login: (token: string, refreshToken?: string, kind?: SessionKind) => void;
  logout: () => Promise<void>;
  getToken: () => string | null;
  /** A token that is valid now, refreshing first if needed. Prefer this. */
  getFreshToken: () => Promise<string | null>;
}

export const useAuthToken = (): UseAuthTokenResult => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  /*
   * Kept so `authDebug` (dev) and account deletion keep working. It no longer
   * navigates: `forceSignOut` in the token service owns that, and having two things
   * race to redirect is how you get a redirect loop.
   */
  useEffect(() => {
    const handleAuthLogout = (e: Event) => {
      const reason = (e as CustomEvent<{ reason?: string }>).detail?.reason;
      console.log('Global logout triggered:', reason);
      clearSessionData();
    };

    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, []);

  const login = useCallback((token: string, refreshToken?: string, kind: SessionKind = 'unknown') => {
    // Refresh token first: it is what renews the session.
    if (refreshToken) setRefreshToken(refreshToken);
    setAccessToken(token, kind);
  }, []);

  /*
   * There used to be a POST to `/api/auth/logout` here. That endpoint does not exist
   * in the backend, and no component called this function anyway (the menus called
   * clearSessionData directly). It now does the one correct thing.
   */
  const logout = useCallback(async () => {
    signOut();
  }, []);

  const getToken = useCallback((): string | null => getSnapshot().token, []);

  return {
    /*
     * True whenever a session EXISTS, including one whose token needs renewing.
     *
     * Its only consumers are the two headers deciding between "Sign In" buttons and
     * the account menu (AppShellHeader, TopBar). Treating `expired` as signed out
     * made them flash sign-in buttons at someone who is mid-refresh and about to be
     * fine. Callers that need to know whether a request will work should read
     * `status`, or just await `getFreshToken`.
     */
    isAuthenticated: snapshot.status !== 'anonymous',
    token: snapshot.token,
    loading: snapshot.status === 'refreshing',
    status: snapshot.status,
    kind: snapshot.kind,
    login,
    logout,
    getToken,
    getFreshToken,
  };
};
