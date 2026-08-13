import type { LogoutOptions, GetTokenSilentlyOptions } from '@auth0/auth0-react';

/**
 * A hand-off point between the Auth0 React SDK and the code that cannot use hooks.
 *
 * The SDK exposes everything through `useAuth0()`, but three of the places that
 * need it are not React: the axios interceptors, the SignalR `accessTokenFactory`,
 * and the sign-out path. `Auth0Provider` also sits OUTSIDE `BrowserRouter`
 * (main.tsx), so there is no shared component ancestor to thread it through
 * either.
 *
 * `Auth0Bridge.tsx` renders inside the provider and writes the two functions
 * here on mount. Everything else imports them from this module.
 *
 * Deliberately tolerant of not being wired yet: the SDK can fail to initialise
 * (bad env, blocked domain), and when it does, a session should degrade rather
 * than the app throwing on every request. Callers check for null.
 */

type SilentTokenFn = (options?: GetTokenSilentlyOptions) => Promise<string>;
type LogoutFn = (options?: LogoutOptions) => Promise<void> | void;

let silentToken: SilentTokenFn | null = null;
let logout: LogoutFn | null = null;

/**
 * Called by Auth0Bridge on mount. Idempotent by construction: assigning the same
 * two references twice is harmless, which matters because React.StrictMode
 * double-invokes the effect that calls this.
 */
export function wireAuth0(fns: { silentToken: SilentTokenFn; logout: LogoutFn }): void {
  silentToken = fns.silentToken;
  logout = fns.logout;
}

/** Null until the provider has mounted, or if the SDK failed to initialise. */
export function getSilentTokenFn(): SilentTokenFn | null {
  return silentToken;
}

export function getLogoutFn(): LogoutFn | null {
  return logout;
}

export function isAuth0Wired(): boolean {
  return silentToken !== null;
}
