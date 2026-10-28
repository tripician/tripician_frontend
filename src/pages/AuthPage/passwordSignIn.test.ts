import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Email and password sign-in, shared by the sign-in page and by sign-up once
 * its emailed code is accepted. What matters most here:
 *
 *  - a right password on an account still owing its sign-up code asks for the
 *    code and starts no session
 *  - a real sign-in starts from a clean browser and stores the refresh token
 *    before the access token
 *  - the password never reaches the console, even on a network error whose
 *    request config carries it
 */

/** Every session step, in the order it ran. */
let steps: string[];
let signinImpl: () => Promise<unknown>;
let profileImpl: () => Promise<unknown>;

vi.mock('../../services/APIs/Auth/auth', () => ({
  authAPI: { signin: () => signinImpl() },
}));
vi.mock('../../services/auth/sessionStatus', () => ({
  setAccessToken: (token: string, kind: string) => { steps.push(`access ${token} ${kind}`); },
  setRefreshToken: (token: string) => { steps.push(`refresh ${token}`); },
}));
vi.mock('../../utils/authSession', () => ({
  clearSessionData: () => { steps.push('clear'); },
}));
vi.mock('../../store/userSlice', () => ({
  fetchUserProfile: (arg: { token: string; force: boolean }) => ({ type: 'user/fetchUserProfile', arg }),
}));

import type { AppDispatch } from '../../store';
import { EMAIL_UNVERIFIED, signInWithPassword } from './passwordSignIn';

const dispatch = ((action: { arg: { token: string; force: boolean } }) => {
  steps.push(`profile ${action.arg.token} force=${action.arg.force}`);
  return { unwrap: () => profileImpl() };
}) as unknown as AppDispatch;

const PASSWORD = 'correct-horse-battery';
const credentials = { email: 'alex@example.com', password: PASSWORD };

/** An axios-style failure; `config` carries the request body, password and all. */
const failWith = (status: number | undefined, data?: unknown) => () =>
  Promise.reject(Object.assign(new Error(status ? `Request failed with status code ${status}` : 'Network Error'), {
    response: status ? { status, data } : undefined,
    config: { data: JSON.stringify(credentials) },
  }));

const signedInWith = (data: Record<string, unknown>) => () => Promise.resolve({ data });

let errorLog: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  steps = [];
  profileImpl = () => Promise.resolve({});
  errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  errorLog.mockRestore();
});

describe('signInWithPassword', () => {
  it('starts a clean session, refresh token before access token, then loads the profile', async () => {
    signinImpl = signedInWith({ success: true, accessToken: 'at-1', refreshToken: 'rt-1' });

    expect(await signInWithPassword(credentials, dispatch)).toEqual({ status: 'signedIn' });
    expect(steps).toEqual(['clear', 'refresh rt-1', 'access at-1 password', 'profile at-1 force=true']);
  });

  it('signs in without a refresh token when none came back', async () => {
    signinImpl = signedInWith({ success: true, accessToken: 'at-2' });

    expect(await signInWithPassword(credentials, dispatch)).toEqual({ status: 'signedIn' });
    expect(steps).toEqual(['clear', 'access at-2 password', 'profile at-2 force=true']);
  });

  it('asks for the emailed code and starts no session', async () => {
    signinImpl = failWith(403, {
      code: EMAIL_UNVERIFIED,
      message: 'Your account needs the 6-digit code we emailed to alex@example.com. To enter it, update the Tripician app or sign in at tripician.com.',
    });

    expect(await signInWithPassword(credentials, dispatch)).toEqual({ status: 'unverified' });
    expect(steps).toEqual([]);
  });

  it('treats any other 403 as a failure with its message', async () => {
    signinImpl = failWith(403, { code: 'FORBIDDEN', message: 'This account is suspended.' });

    expect(await signInWithPassword(credentials, dispatch)).toEqual({
      status: 'failed',
      error: 'This account is suspended.',
    });
  });

  it('keeps the sign-in page messages for the other failures', async () => {
    const cases: Array<[() => Promise<unknown>, string]> = [
      [failWith(401, { message: 'Wrong password for alex@example.com' }), 'Invalid email or password. Please try again.'],
      [failWith(400, { message: 'Email is required.' }), 'Email is required.'],
      [failWith(400, {}), 'Invalid signin data. Please check your information.'],
      [failWith(503, { message: 'Upstream down' }), 'Server error occurred. Please try again later.'],
      [failWith(undefined), 'An error occurred during sign in. Please try again.'],
    ];
    for (const [impl, error] of cases) {
      signinImpl = impl;
      expect(await signInWithPassword(credentials, dispatch)).toEqual({ status: 'failed', error });
    }
    expect(steps).toEqual([]);
  });

  it('refuses a reply without an access token and stores nothing', async () => {
    signinImpl = signedInWith({ success: true });

    expect(await signInWithPassword(credentials, dispatch)).toEqual({
      status: 'failed',
      error: 'Unexpected response from server. Please try again.',
    });
    expect(steps).toEqual([]);
  });

  it('fails when the profile cannot be loaded after signing in', async () => {
    signinImpl = signedInWith({ success: true, accessToken: 'at-3' });
    profileImpl = () => Promise.reject(new Error('profile 500'));

    expect(await signInWithPassword(credentials, dispatch)).toEqual({
      status: 'failed',
      error: 'Failed to load user profile after sign in. Please try again.',
    });
  });

  it('never logs the password', async () => {
    for (const status of [undefined, 400, 401, 403, 500]) {
      signinImpl = failWith(status, { code: status === 403 ? EMAIL_UNVERIFIED : undefined });
      await signInWithPassword(credentials, dispatch);
    }

    expect(errorLog).toHaveBeenCalled();
    const logged = JSON.stringify(errorLog.mock.calls, (_key, value) =>
      value instanceof Error ? { message: value.message, ...value } : value);
    expect(logged).not.toContain(PASSWORD);
  });
});
