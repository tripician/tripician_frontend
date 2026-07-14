import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthToken } from '../../../hooks/useAuth0Token';
import PageLoader from '../../../components/CommonComponents/PageLoader';

interface GuestRouteProps {
  children: React.ReactNode;
}

/**
 * GuestRoute ,only accessible when NOT logged in.
 * If the user is already authenticated, redirects them to /home.
 */
const GuestRoute: React.FC<GuestRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuthToken();

  if (loading) {
    return <PageLoader messages={['Checking your session…', 'Verifying credentials…', 'Almost ready…']} />;
  }

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};

export default GuestRoute;
