import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthToken } from '../../../hooks/useAuth0Token';
import PageLoader from '../../../components/CommonComponents/PageLoader';

interface GuestRouteProps {
  children: React.ReactNode;
}

/**
 * Only reachable when NOT signed in. Signed-in users go to /home.
 *
 * **This guard used to be a trap.** Its test was "does a token string exist", so a
 * user holding an EXPIRED token could not open /signin even by typing the URL: they
 * were bounced to /home, where every request 401'd. The only escape was finding Sign
 * out in the account menu, i.e. you had to sign out before you were allowed to sign
 * in. `expired` now falls through to the form, which is the whole point.
 *
 * See ProtectedRoute for why all three guards must read the same status enum.
 */
const GuestRoute: React.FC<GuestRouteProps> = ({ children }) => {
  const { status } = useAuthToken();

  // Mid-refresh: wait rather than guess. If it succeeds they are bounced to /home,
  // which is correct ("you are still signed in"); if it fails they get the form.
  if (status === 'refreshing') {
    return <PageLoader messages={['Checking your session…', 'Verifying credentials…', 'Almost ready…']} />;
  }

  if (status === 'valid') {
    return <Navigate to="/home" replace />;
  }

  // 'anonymous' and 'expired' both belong on the sign-in form.
  return <>{children}</>;
};

export default GuestRoute;
