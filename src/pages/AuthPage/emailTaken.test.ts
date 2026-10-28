import { describe, it, expect } from 'vitest';
import { EMAIL_TAKEN, emailTakenFrom } from './emailTaken';

/** An axios-style failure with the given status and body. */
const failure = (status: number, data: unknown) => ({ response: { status, data } });

describe('emailTakenFrom', () => {
  it('reads an account that signs in with Google', () => {
    expect(emailTakenFrom(failure(409, {
      code: EMAIL_TAKEN,
      message: 'This email already has a Tripician account that signs in with Google. Use Continue with Google.',
      signInWith: 'google',
    }))).toEqual({
      message: 'This email already has a Tripician account that signs in with Google. Use Continue with Google.',
      signInWith: 'google',
    });
  });

  it('reads an account that signs in with a password', () => {
    expect(emailTakenFrom(failure(409, { code: EMAIL_TAKEN, message: 'Sign in instead.', signInWith: 'password' })))
      .toEqual({ message: 'Sign in instead.', signInWith: 'password' });
  });

  it('keeps "other", and treats an unknown or missing method as a password sign-in', () => {
    expect(emailTakenFrom(failure(409, { code: EMAIL_TAKEN, message: 'm', signInWith: 'other' }))?.signInWith).toBe('other');
    expect(emailTakenFrom(failure(409, { code: EMAIL_TAKEN, message: 'm', signInWith: 'apple' }))?.signInWith).toBe('password');
    expect(emailTakenFrom(failure(409, { code: EMAIL_TAKEN, message: 'm' }))?.signInWith).toBe('password');
  });

  it('has a sentence of its own when the server sent none', () => {
    expect(emailTakenFrom(failure(409, { code: EMAIL_TAKEN }))?.message)
      .toBe('This email already has a Tripician account. Sign in instead.');
  });

  it('ignores every other failure', () => {
    expect(emailTakenFrom(failure(409, { code: 'SOMETHING_ELSE', message: 'Conflict' }))).toBeNull();
    expect(emailTakenFrom(failure(400, { code: EMAIL_TAKEN }))).toBeNull();
    expect(emailTakenFrom(failure(429, 'Too many sign-up attempts.'))).toBeNull();
    expect(emailTakenFrom(new Error('Network Error'))).toBeNull();
    expect(emailTakenFrom(null)).toBeNull();
  });
});
