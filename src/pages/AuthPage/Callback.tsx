import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import { fetchUserProfile } from '../../store/userSlice';
import { authAPI } from '../../services/APIs/Auth/auth';

const Callback = () => {
  const { getIdTokenClaims, isAuthenticated, isLoading, error } = useAuth0();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const didRun = useRef(false);
  const [callbackError, setCallbackError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (didRun.current) return;
    didRun.current = true;

    if (error) {
      console.error('[Callback] Auth0 error:', error);
      setCallbackError('Authentication failed. Please try again.');
      setTimeout(() => navigate('/signin'), 2000);
      return;
    }

    if (!isAuthenticated) {
      setCallbackError('Not authenticated. Please sign in.');
      setTimeout(() => navigate('/signin'), 2000);
      return;
    }

    const exchange = async () => {
      try {
        const idTokenClaims = await getIdTokenClaims();
        const idToken = idTokenClaims?.__raw;
        if (!idToken) {
          setCallbackError('Missing id_token from Auth0.');
          setTimeout(() => navigate('/signin'), 2000);
          return;
        }

        // Mask and log token info for debugging
        try {
          // eslint-disable-next-line no-console
          console.debug('[Callback] Auth0 id_token (masked):', idToken ? `${idToken.slice(0,8)}...` : '<none>');
        } catch {}

        // Send id_token as AccessToken (PascalCase) to backend
        const response = await authAPI.socialCallback(idToken);

        // Log backend response (mask server token)
        try {
          // eslint-disable-next-line no-console
          console.debug('[Callback] socialCallback response:', {
            status: response.status,
            data: {
              success: response.data?.success,
              accessToken: response.data?.accessToken ? `${response.data.accessToken.slice(0,8)}...` : null,
            }
          });
        } catch {}

        if (response.data?.success && response.data?.accessToken) {
          localStorage.setItem('accessToken', response.data.accessToken);
          if (response.data.refreshToken) {
            localStorage.setItem('refreshToken', response.data.refreshToken);
          }
          try {
            // Ensure profile is loaded using the exact token we just received to avoid races
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            await dispatch(fetchUserProfile({ token: response.data.accessToken })).unwrap();
          } catch (e) {
            // If profile fetch fails, still navigate to signin for now
            console.error('[Callback] fetchUserProfile failed after token exchange', e);
            setCallbackError('Failed to load user profile.');
            setTimeout(() => navigate('/signin'), 2000);
            return;
          }
          navigate('/home', { replace: true });
        } else {
          console.error('[Callback] Unexpected response:', response.data);
          setCallbackError('Unexpected response from server.');
          setTimeout(() => navigate('/signin'), 2000);
        }
      } catch (err) {
        console.error('[Callback] Token exchange failed:', err);
        setCallbackError('Token exchange failed. Please try again.');
        setTimeout(() => navigate('/signin'), 2000);
      }
    };

    exchange();
  }, [isAuthenticated, isLoading, error, getIdTokenClaims, navigate, dispatch]);

  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      gap={2}
    >
      <CircularProgress sx={{ color: '#FF385C' }} />
      <Typography
        sx={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: 'text.secondary' }}
      >
        {callbackError ? callbackError : 'Signing you in…'}
      </Typography>
    </Box>
  );
};

export default Callback;
