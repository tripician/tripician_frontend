import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthToken } from '../../../hooks/useAuth0Token';
import PageLoader from '../../../components/CommonComponents/PageLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Signed-in only.
 *
 * All three guards (this, GuestRoute, RootRedirect) read the SAME `status` from the
 * same store, and that is load-bearing rather than tidiness. If this one treated
 * `refreshing` as expired while GuestRoute treated it as valid, the two would bounce
 * the user between /signin and /home indefinitely.
 *
 * `refreshing` is the only state that shows a loader, and the store initialises
 * synchronously from localStorage, so a user with a good token renders children on
 * the first paint. The old version started every mount at `loading: true` and
 * resolved in an effect, which is why the loader used to flash on every navigation.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { status } = useAuthToken();

  if (status === 'refreshing') {
    return <PageLoader messages={['Checking your session…', 'Verifying credentials…', 'Almost ready…']} />;
  }

  /*
   * Only `anonymous` is turned away, and `expired` deliberately is not.
   *
   * The token service refuses to end a session over a 5xx or a dropped connection,
   * because the credential is probably fine and the network is not. But a refresh
   * that fails that way leaves the status at `expired`, so redirecting on it here
   * would throw the user out to /signin on a blip and undo that decision from the
   * other end.
   *
   * A session ends in exactly one place: forceSignOut, which clears storage (making
   * this `anonymous`) and hard-navigates. So an expired token renders the app, its
   * first request 401s, and the interceptor either renews it or ends the session
   * properly. One authority, one exit.
   */
  if (status === 'anonymous') {
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
