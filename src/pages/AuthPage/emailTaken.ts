/** The server's code when an email already has a Tripician account. */
export const EMAIL_TAKEN = 'EMAIL_TAKEN';

/** How the account that has the email signs in, so the page can offer that way in. */
export type SignInMethod = 'google' | 'password' | 'other';

export type EmailTaken = { message: string; signInWith: SignInMethod };

/**
 * The server's "this email already has an account" answer to a sign-up, or null
 * for any other failure. The app reads the same answer the same way.
 */
export function emailTakenFrom(err: unknown): EmailTaken | null {
  const response = (err as { response?: { status?: number; data?: unknown } } | null)?.response;
  const data = response?.data as { code?: unknown; message?: unknown; signInWith?: unknown } | undefined;
  if (response?.status !== 409 || data?.code !== EMAIL_TAKEN) return null;
  return {
    message: typeof data.message === 'string' && data.message.trim()
      ? data.message
      : 'This email already has a Tripician account. Sign in instead.',
    signInWith: data.signInWith === 'google' || data.signInWith === 'other' ? data.signInWith : 'password',
  };
}
