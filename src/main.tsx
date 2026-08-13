import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import ThemeProvider from './components/ThemeProvider';
import { Auth0Provider } from '@auth0/auth0-react';
import { HelmetProvider } from 'react-helmet-async';
import WireAuth0 from './services/auth/WireAuth0';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Global listeners to surface background script / extension errors in a consistent way
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    if (!(e instanceof ErrorEvent)) return;
    // eslint-disable-next-line no-console
    console.warn('[GlobalError]', e.message, e.filename, e.lineno+':'+e.colno);
  });
  window.addEventListener('unhandledrejection', (e) => {
    // eslint-disable-next-line no-console
    console.warn('[UnhandledRejection]', e.reason);
  });
}

root.render(
  <React.StrictMode>
    <HelmetProvider>
      {/*
        `cacheLocation: 'localstorage'` and `useRefreshTokens` are what let a Google
        session survive a reload and renew itself. The trade-off, stated plainly: a
        long-lived refresh token now sits in localStorage where any successful XSS
        could read it. It is still the right call here, because the email/password
        path has always written an Auth0 refresh token to localStorage anyway, so
        this is not a new exposure class; and the alternative, the default in-memory
        cache, does not survive a reload at all, leaving only hidden-iframe auth,
        which Safari and Firefox block. Refresh-token rotation is the compensating
        control: a stolen token that gets used collides with the real client and
        Auth0 revokes the family.

        `useRefreshTokensFallback` keeps the iframe path available for the cases
        where the refresh grant is unavailable, which during rollout is the
        difference between a degraded session and a signed-out user.

        Do NOT add `offline_access` to `scope` here. `useRefreshTokens` puts it on the
        client scope itself, and the SDK unions client scope with per-call scope, so
        the sign-in page's `scope: 'openid profile email'` cannot strip it. Hardcoding
        it would just be a second place to get wrong.
      */}
      <Auth0Provider
        domain={import.meta.env.VITE_AUTH0_DOMAIN}
        clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
        authorizationParams={{ redirect_uri: `${window.location.origin}/callback`, audience: import.meta.env.VITE_AUTH0_AUDIENCE }}
        cacheLocation="localstorage"
        useRefreshTokens
        useRefreshTokensFallback
      >
        {/* Hands the SDK's getAccessTokenSilently and logout to non-React callers
            (axios interceptors, SignalR, sign-out). Renders nothing. */}
        <WireAuth0 />
        <Provider store={store}>
          <ThemeProvider>
            <BrowserRouter>
              <ErrorBoundary>
                <App />
              </ErrorBoundary>
            </BrowserRouter>
          </ThemeProvider>
        </Provider>
      </Auth0Provider>
    </HelmetProvider>
  </React.StrictMode>
);
