import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthToken } from '../../../hooks/useAuth0Token';
import PageLoader from '../../../components/CommonComponents/PageLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuthToken();

  if (loading) {
    return <PageLoader messages={['Checking your session…', 'Verifying credentials…', 'Almost ready…']} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;