/** Digits in a sign-up code. */
export const CODE_LENGTH = 6;

/** The server mails a fresh code at most once a minute; the button waits the same. */
export const RESEND_SECONDS = 60;

/** Digits only, at most six: what a paste ("123 456", "Your code: 123456") leaves. */
export function codeFrom(text: string): string {
  return text.replace(/\D/g, '').slice(0, CODE_LENGTH);
}

/** "0:42" for the resend countdown. */
export function countdownLabel(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
