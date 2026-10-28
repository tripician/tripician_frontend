import { authAPI } from '../../services/APIs/Auth/auth';
import { setAccessToken, setRefreshToken } from '../../services/auth/sessionStatus';
import type { AppDispatch } from '../../store';
import { fetchUserProfile } from '../../store/userSlice';
import { clearSessionData } from '../../utils/authSession';

/** The server's code when the password was right but the sign-up email code is still owed. */
export const EMAIL_UNVERIFIED = 'EMAIL_UNVERIFIED';

export type PasswordSignInResult =
  | { status: 'signedIn' }
  /**
   * Right password, but the account still waits on its emailed sign-up code
   * (the server has sent a fresh one). The server's sentence is left out: it is
   * written for app versions without a code step, and this site has one.
   */
  | { status: 'unverified' }
  | { status: 'failed'; error: string };

/**
 * Signs in with email and password and starts the session, for the sign-in
 * page and for sign-up once its emailed code is accepted.
 *
 * Never logs the credentials or the response: the first is the user's
 * password in plain text, the second carries the access and refresh tokens.
 */
export async function signInWithPassword(
  credentials: { email: string; password: string },
  dispatch: AppDispatch,
): Promise<PasswordSignInResult> {
  let response;
  try {
    response = await authAPI.signin(credentials);
  } catch (err: any) {
    const status: number | undefined = err?.response?.status;
    const data = err?.response?.data;
    // Status only: the error's request config holds the password.
    console.error('SignIn error:', status ?? err?.message);
    if (status === 403 && data?.code === EMAIL_UNVERIFIED) {
      return { status: 'unverified' };
    }
    if (status === 401) {
      return { status: 'failed', error: 'Invalid email or password. Please try again.' };
    }
    if (status === 400) {
      return { status: 'failed', error: data?.message || 'Invalid signin data. Please check your information.' };
    }
    if (status !== undefined && status >= 500) {
      return { status: 'failed', error: 'Server error occurred. Please try again later.' };
    }
    return { status: 'failed', error: data?.message || 'An error occurred during sign in. Please try again.' };
  }

  if (!(response.data?.success && response.data?.accessToken)) {
    return { status: 'failed', error: 'Unexpected response from server. Please try again.' };
  }

  // Start from a clean browser: whoever was signed in here before must
  // leave nothing that this session could read. No `preserveAuth0Cache` here,
  // unlike /callback: this path establishes no Auth0 SDK session, so there is
  // nothing of ours in that cache worth keeping.
  clearSessionData();

  // Refresh token first: it is what renews this session, and storing it after
  // the access token would leave a window where a refresh has nothing to use.
  if (response.data.refreshToken) {
    setRefreshToken(response.data.refreshToken);
  }
  // `password`: renewals go through POST /auth/refresh, because this token came
  // from the backend's confidential client and only it can redeem the refresh
  // token Auth0 bound to that client.
  setAccessToken(response.data.accessToken, 'password');

  // Ensure profile is fetched using this exact token before navigating to avoid race.
  // `force` skips the cache outright - belt and braces alongside clearSessionData().
  try {
    await dispatch(fetchUserProfile({ token: response.data.accessToken, force: true })).unwrap();
  } catch (e) {
    console.error('[Signin] fetchUserProfile failed after signin', e);
    return { status: 'failed', error: 'Failed to load user profile after sign in. Please try again.' };
  }
  return { status: 'signedIn' };
}
