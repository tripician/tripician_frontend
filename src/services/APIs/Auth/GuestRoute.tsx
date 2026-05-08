import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthToken } from '../../../hooks/useAuth0Token';
import { Box, CircularProgress } from '@mui/material';

interface GuestRouteProps {
  children: React.ReactNode;
}

/**
 * GuestRoute — only accessible when NOT logged in.
 * If the user is already authenticated, redirects them to /home.
 */
const GuestRoute: React.FC<GuestRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuthToken();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};

export default GuestRoute;
