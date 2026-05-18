import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import { fetchUserProfile } from '../../store/userSlice';
import { authAPI } from '../../services/APIs/Auth/auth';

const Callback = () => {
  const { getAccessTokenSilently, isAuthenticated, isLoading, error } = useAuth0();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const didRun = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (didRun.current) return;
    didRun.current = true;

    if (error) {
      console.error('[Callback] Auth0 error:', error);
      navigate('/signin');
      return;
    }

    if (!isAuthenticated) {
      navigate('/signin');
      return;
    }

    const exchange = async () => {
      try {
        const accessToken = await getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE ?? 'https://tripician-production-api',
            scope: 'openid profile email',
          },
        });

        // Mask and log token info for debugging
        try {
          // eslint-disable-next-line no-console
          console.debug('[Callback] Auth0 accessToken (masked):', accessToken ? `${accessToken.slice(0,8)}...` : '<none>');
        } catch {}

        const response = await authAPI.socialCallback(accessToken);

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
            navigate('/signin');
            return;
          }
          navigate('/home', { replace: true });
        } else {
          console.error('[Callback] Unexpected response:', response.data);
          navigate('/signin');
        }
      } catch (err) {
        console.error('[Callback] Token exchange failed:', err);
        navigate('/signin');
      }
    };

    exchange();
  }, [isAuthenticated, isLoading, error, getAccessTokenSilently, navigate, dispatch]);

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
        Signing you in…
      </Typography>
    </Box>
  );
};

export default Callback;
