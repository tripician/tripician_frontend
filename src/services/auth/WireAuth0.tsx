import { useEffect, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { wireAuth0 } from './auth0Bridge';
import { getSnapshot } from './sessionStatus';
import { getFreshToken } from './tokenService';

/**
 * Renders nothing. Its only job is to hand the SDK's two functions to
 * `auth0Bridge` so non-React code can reach them. Must be a child of
 * `Auth0Provider`; see the note in auth0Bridge.ts for why the seam exists.
 *
 * Named WireAuth0 rather than Auth0Bridge because a component file called
 * `Auth0Bridge.tsx` next to `auth0Bridge.ts` differs only in casing, and on a
 * case-insensitive filesystem TypeScript resolves both imports to one file.
 */
export const WireAuth0: React.FC = () => {
  const { getAccessTokenSilently, logout } = useAuth0();
  const kickedRef = useRef(false);

  useEffect(() => {
    wireAuth0({ silentToken: getAccessTokenSilently, logout });

    /*
     * Renew a stale session on load, once.
     *
     * Without this, a token that is already expired when the page opens is only
     * noticed when something happens to make a request, so a page that fetches
     * nothing would sit there looking signed in forever. The most common case is
     * not an expiry at all: it is a Google session still holding one of the old
     * id_tokens, which counts as unusable and swaps itself for a real access token
     * here without the user noticing.
     *
     * Placed in this component on purpose. It runs immediately after the bridge is
     * wired, so a social session has its strategy available; kicked from anywhere
     * else it could fire first and find no way to renew.
     *
     * Guarded by a ref, not by a status dependency. Depending on `status` would
     * re-fire every time a failed refresh settled back to `expired`, which on a
     * network outage is an unbounded retry loop against the server.
     */
    if (kickedRef.current) return;
    kickedRef.current = true;
    if (getSnapshot().status === 'expired') {
      void getFreshToken({ force: true });
    }
  }, [getAccessTokenSilently, logout]);

  return null;
};

export default WireAuth0;
