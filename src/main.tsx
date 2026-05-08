import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import { BrowserRouter } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Provider } from 'react-redux';
import { store } from './store';
import ThemeProvider from './components/ThemeProvider';
import { Auth0Provider } from '@auth0/auth0-react';

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
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{ redirect_uri: window.location.origin }}
    >
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
  </React.StrictMode>
);
