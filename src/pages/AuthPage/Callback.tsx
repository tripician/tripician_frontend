import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import { fetchUserProfile } from '../../store/userSlice';
import { clearSessionData } from '../../utils/authSession';
import { setAccessToken, setRefreshToken } from '../../services/auth/sessionStatus';
import { peekPendingPrompt } from '../../utils/pendingNaviaPrompt';
import { authAPI } from '../../services/APIs/Auth/auth';

const Callback = () => {
  const { getAccessTokenSilently, isAuthenticated, isLoading, error } = useAuth0();
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
        /*
         * An ACCESS token for the API audience, not an id_token.
         *
         * This used to send `getIdTokenClaims().__raw`, which the backend echoed
         * back and the app then used as its bearer credential for every request. That
         * only worked because the Auth0 client id was listed as a valid audience, and
         * an ID token is not an API credential: it is a statement about who the user
         * is, for this app to read, with a short life and no renewal path of its own.
         *
         * `getAccessTokenSilently` returns a token scoped to VITE_AUTH0_AUDIENCE,
         * which the backend already accepts, and which the SDK can renew silently
         * from here on. Anyone still holding an old id_token migrates on their next
         * request: `isLegacyIdToken` marks it unusable and the refresh path swaps it
         * for a real access token.
         */
        const accessToken = await getAccessTokenSilently();
        if (!accessToken) {
          setCallbackError('Could not obtain an access token from Auth0.');
          setTimeout(() => navigate('/signin'), 2000);
          return;
        }

        // Mask and log token info for debugging
        try {
           
          console.debug('[Callback] Auth0 access token (masked):', `${accessToken.slice(0,8)}...`);
        } catch {}

        const response = await authAPI.socialCallback(accessToken);

        // Log backend response (mask server token)
        try {
           
          console.debug('[Callback] socialCallback response:', {
            status: response.status,
            data: {
              success: response.data?.success,
              accessToken: response.data?.accessToken ? `${response.data.accessToken.slice(0,8)}...` : null,
            }
          });
        } catch {}

        if (response.data?.success && response.data?.accessToken) {
          // Start from a clean browser: whoever was signed in here before must
          // leave nothing that this session could read. This is the path a user
          // takes when signing into a second Google account after deleting a
          // first one, which is exactly where the stale-identity bug surfaced.
          //
          // `preserveAuth0Cache` is not a convenience. The SDK cached THIS session
          // moments ago (that is what made `isAuthenticated` true above), and that
          // cache holds the refresh token silent renewal depends on. Without the
          // flag, this line deletes the credential two lines before the access token
          // is stored, and refresh then works in Chrome (hidden-iframe fallback) but
          // fails in Safari and Firefox.
          clearSessionData({ preserveAuth0Cache: true });

          // `social`: renewals for this session go through the Auth0 SDK, not
          // /auth/refresh, because the SPA flow issues no refresh token of its own.
          setAccessToken(response.data.accessToken, 'social');
          if (response.data.refreshToken) {
            setRefreshToken(response.data.refreshToken);
          }
          try {
            // Ensure profile is loaded using the exact token we just received to avoid races.
            // `force` skips the cache outright - belt and braces alongside clearSessionData().
             
            await dispatch(fetchUserProfile({ token: response.data.accessToken, force: true })).unwrap();
          } catch (e) {
            // If profile fetch fails, still navigate to signin for now
            console.error('[Callback] fetchUserProfile failed after token exchange', e);
            setCallbackError('Failed to load user profile.');
            setTimeout(() => navigate('/signin'), 2000);
            return;
          }
          // See the note in Signin.tsx - same hand-off, but this is the path
          // that survived a full page reload out to Auth0 and back.
          navigate(peekPendingPrompt() ? '/navia' : '/home', { replace: true });
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
      <CircularProgress sx={{ color: 'primary.main' }} />
      <Typography
        sx={{ fontSize: '0.875rem', color: 'text.secondary' }}
      >
        {callbackError ? callbackError : 'Signing you in…'}
      </Typography>
    </Box>
  );
};

export default Callback;
