import { clearSessionData } from '../../utils/authSession';
import { getLogoutFn } from './auth0Bridge';
import { markAnonymous } from './sessionStatus';

/**
 * The one way out of a session.
 *
 * There were four copies of this (the two header menus, the dashboard menu and
 * account deletion) and all four did the same two things: `clearSessionData()` then
 * navigate to /signin. None of them ended the **Auth0** session, so the IdP cookie
 * at login.tripician.com outlived every sign-out, and "Continue with Google" walked
 * straight back into the account the user believed they had left, with no account
 * chooser and no prompt.
 *
 * ## Why this does not hand the browser to Auth0
 *
 * The obvious implementation is `logout({ logoutParams: { returnTo } })`, which
 * navigates to Auth0 and back. It is also a trap: Auth0 validates `returnTo` against
 * the application's **Allowed Logout URLs** and shows its own "Oops!, something went
 * wrong" page for anything not listed. That means sign-out is broken on every origin
 * nobody remembered to register, which in practice is localhost, every Vercel preview
 * deployment, and the apex host when the list only has www.
 *
 * So the logout URL is loaded in a hidden iframe with **no `returnTo` at all**. With
 * no redirect target there is nothing for Auth0 to validate, so it cannot reject it,
 * and the user is never handed to a page that can strand them.
 *
 * Three things have to happen, and the order matters:
 *   1. local storage teardown, which includes the Auth0 SDK's own cache and therefore
 *      the refresh token
 *   2. the session store, or the app keeps believing the user is signed in
 *   3. navigation, done through the router when the caller offers one so the document
 *      survives and the iframe request is not cancelled mid-flight
 *
 * Honest limitation: the iframe can only clear the IdP cookie where the browser will
 * send it. In production the app and Auth0 share the registrable domain, so it works.
 * On localhost they are cross-site, so the cookie may survive and a later Google
 * sign-in will not re-prompt. That is a development-only gap, and the alternative
 * (a top-level redirect) trades it for a sign-out that fails outright.
 */
export function signOut(navigateToSignIn?: () => void): void {
  // 1. Local teardown, unconditionally and first. Whatever happens with the IdP,
  //    this browser must not be left holding a usable token or refresh token.
  try {
    clearSessionData();
  } catch (e) {
    console.error('[signOut] clearSessionData failed', e);
  }

  // 2. Tell the app. clearSessionData only touches storage, and the `storage` event
  //    does not fire in the tab that caused it, so without this the in-memory session
  //    still reads as valid and the route guards keep letting the user through. This
  //    was masked while sign-out always ended in a full page reload.
  markAnonymous();

  const logout = getLogoutFn();
  const endIdpSession = () => {
    if (!logout) return Promise.resolve();
    try {
      return Promise.resolve(logout({
        // Deliberately no logoutParams.returnTo. See the note above.
        openUrl: (url: string) => loadInHiddenIframe(url),
      }));
    } catch (e) {
      console.error('[signOut] Auth0 logout failed; the local session is already gone', e);
      return Promise.resolve();
    }
  };

  // 3. Navigate.
  if (navigateToSignIn) {
    // A router navigation keeps the document alive, so the user lands on /signin at
    // once and the iframe finishes in the background.
    navigateToSignIn();
    void endIdpSession();
    return;
  }

  // No router to hand back to: a full page load would cancel the iframe, so give it a
  // bounded moment first.
  void endIdpSession().finally(() => {
    try { window.location.assign('/signin'); } catch { /* nothing left to try */ }
  });
}

/**
 * Loads a URL out of sight, resolving on load, error, or a short timeout, whichever
 * comes first. The timeout is what stops a blocked or slow request from holding up a
 * sign-out; the point is best effort, never a gate.
 */
function loadInHiddenIframe(url: string, timeoutMs = 900): Promise<void> {
  return new Promise<void>((resolve) => {
    if (typeof document === 'undefined') { resolve(); return; }

    let settled = false;
    const iframe = document.createElement('iframe');

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { iframe.remove(); } catch { /* already gone with the document */ }
      resolve();
    };

    const timer = setTimeout(finish, timeoutMs);

    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('tabindex', '-1');
    iframe.title = 'Signing out';
    iframe.style.display = 'none';
    iframe.onload = finish;
    iframe.onerror = finish;
    iframe.src = url;

    try {
      document.body.appendChild(iframe);
    } catch (e) {
      console.error('[signOut] could not attach the logout frame', e);
      finish();
    }
  });
}
