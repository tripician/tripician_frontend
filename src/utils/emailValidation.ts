// Email validation shared across the auth flows.
//
// Two concerns:
//   1. Format  a light, practical email shape check (the HTML5 `type=email`
//      constraint is not enforced consistently across submit paths).
//   2. Disposable / throwaway providers  blocked at *registration* only, so
//      accounts map to reachable inboxes. Login / forgot-password intentionally
//      skip the block so anyone who registered before the rule keeps access.
//
// `test.com` and `dev.com` are always allowed (allowlist wins over blocklist)
// so the team can keep signing up in any environment. This mirrors the
// authoritative backend check in appsettings.json > EmailValidation.

export interface EmailValidationResult {
  valid: boolean;
  error?: string;
}

// Always-allowed domains  checked BEFORE the blocklist (allowlist wins).
export const ALLOWED_TEST_DOMAINS = ['test.com', 'dev.com'];

// Curated list of the most common disposable / temp-mail providers. Kept in
// sync with backend appsettings.json > EmailValidation.BlockedDomains.
export const BLOCKED_EMAIL_DOMAINS = [
  'yopmail.com', 'yopmail.net', 'yopmail.fr',
  'mailinator.com', 'mailinator.net',
  'tempmail.com', 'temp-mail.org', 'temp-mail.io', 'tempmailo.com', 'tempmail.net',
  'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamail.biz',
  'sharklasers.com', 'grr.la', 'guerrillamailblock.com',
  '10minutemail.com', '10minutemail.net', '10minutemail.org',
  'minuteinbox.com', 'tempinbox.com', 'throwawaymail.com', 'throwawaymail.net',
  'trashmail.com', 'trashmail.de', 'trashmail.net',
  'getnada.com', 'nada.email',
  'mailnesia.com', 'maildrop.cc', 'dispostable.com', 'fakeinbox.com',
  'mailcatch.com', 'mohmal.com', 'mytemp.email', 'tmpmail.org', 'tmpmail.net',
  'moakt.com', 'emailondeck.com', 'mailtemp.net', 'spam4.me', 'spambox.us',
  'discard.email', 'discardmail.com', 'discardmail.de',
  'maileater.com', 'tempr.email', 'luxusmail.org', 'inboxbear.com',
  'byom.de', '33mail.com', 'anonbox.net', 'mailde.de', 'wegwerfmail.de',
  'einrot.com', 'spamgourmet.com', 'jetable.org', 'mailexpire.com',
  'deadaddress.com', 'incognitomail.org', 'gishpuppy.com', 'spambog.com',
  'tempemail.co', 'one-time.email', 'fake-mail.net', 'fakemailgenerator.com',
  'mailsac.com', 'inboxkitten.com', 'burnermail.io', 'emailfake.com',
];

// Practical shape: something@something.tld with no whitespace.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Extracts the lowercase domain part of an email, or '' if not parseable. */
function getDomain(email: string): string {
  return email.trim().toLowerCase().split('@')[1] ?? '';
}

/** Format-only check. Used by every auth form. */
export function validateEmailFormat(email: string): EmailValidationResult {
  const trimmed = email.trim();
  if (!trimmed) return { valid: false, error: 'Please enter your email address.' };
  if (!EMAIL_RE.test(trimmed)) return { valid: false, error: 'Please enter a valid email address.' };
  return { valid: true };
}

/** True when the email uses a known disposable provider (allowlist wins). */
export function isDisposableEmail(email: string): boolean {
  const domain = getDomain(email);
  if (!domain) return false;
  if (ALLOWED_TEST_DOMAINS.includes(domain)) return false;
  return BLOCKED_EMAIL_DOMAINS.includes(domain);
}

/** Registration check: format + disposable-domain block. */
export function validateSignupEmail(email: string): EmailValidationResult {
  const format = validateEmailFormat(email);
  if (!format.valid) return format;
  if (isDisposableEmail(email)) {
    return {
      valid: false,
      error: "Please use a permanent email address. Temporary or disposable emails aren't allowed.",
    };
  }
  return { valid: true };
}
