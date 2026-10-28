import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { authAPI } from '../../services/APIs/Auth/auth';
import { CODE_LENGTH, RESEND_SECONDS, codeFrom, countdownLabel } from './emailCode';

type Props = {
  email: string;
  /** Runs once the code is accepted (signing in); a rejection's message is shown. */
  onVerified: () => Promise<void>;
  /** Leaves the code step: back to the form, with a different email or to sign in. */
  onBack: () => void;
  backLabel: string;
};

/**
 * The 6-digit code from the sign-up email, the same step the app has.
 *
 * One real input sits over six boxes, so typing, pasting, deleting and the
 * browser's one-time-code suggestion all work the ordinary way, and the code
 * goes in the moment the sixth digit lands.
 */
const VerifyEmailStep = ({ email, onVerified, onBack, backLabel }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  // Only after a resend: the heading already says where the first code went.
  const [info, setInfo] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [focused, setFocused] = useState(false);
  // A code was mailed just before this step opened.
  const [resendAt, setResendAt] = useState(() => Date.now() + RESEND_SECONDS * 1000);
  const [now, setNow] = useState(() => Date.now());
  const shake = useAnimationControls();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const waitSeconds = Math.max(0, (resendAt - now) / 1000);
  const busy = verifying || resending;

  const verify = useCallback(async (value: string) => {
    if (value.length !== CODE_LENGTH || verifying) return;
    setVerifying(true);
    setError('');
    try {
      await authAPI.verifyEmail(email, value);
    } catch (err: any) {
      setVerifying(false);
      setError(err?.response?.data?.message || "That code isn't right. Check the email and try again.");
      setCode('');
      inputRef.current?.focus();
      if (!reduceMotion) {
        void shake.start({ x: [0, -8, 8, -5, 0], transition: { duration: 0.25 } });
      }
      return;
    }
    try {
      await onVerified();
    } catch (err: any) {
      setError(err?.message || 'Your email is verified, but signing in failed. Please sign in.');
    } finally {
      setVerifying(false);
    }
  }, [email, verifying, onVerified, reduceMotion, shake]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = codeFrom(event.target.value);
    setCode(next);
    if (error) setError('');
    if (next.length === CODE_LENGTH) void verify(next);
  };

  const resend = async () => {
    if (busy || waitSeconds > 0) return;
    setResending(true);
    setError('');
    try {
      await authAPI.resendVerification(email);
      setResendAt(Date.now() + RESEND_SECONDS * 1000);
      setNow(Date.now());
      setCode('');
      setInfo(`A new code is on its way to ${email}.`);
      inputRef.current?.focus();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Couldn't send a new code. Try again in a moment.");
    } finally {
      setResending(false);
    }
  };

  const active = Math.min(code.length, CODE_LENGTH - 1);

  return (
    <>
      <h1 className="auth-card__heading">Check your email</h1>
      <p className="auth-card__subheading">
        We sent a 6-digit code to <strong>{email}</strong>. Enter it to finish signing up.
      </p>

      {error && <div className="auth-alert auth-alert--error" role="alert">{error}</div>}
      {!error && info && <div className="auth-alert auth-alert--success" aria-live="polite">{info}</div>}

      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          void verify(code);
        }}
      >
        <motion.div className="auth-code" animate={shake} onClick={() => inputRef.current?.focus()}>
          {Array.from({ length: CODE_LENGTH }, (_, index) => (
            <div
              key={index}
              aria-hidden="true"
              className={[
                'auth-code__box',
                focused && index === active ? 'auth-code__box--active' : '',
                error ? 'auth-code__box--error' : '',
              ].join(' ').trim()}
            >
              {code[index] ?? ''}
            </div>
          ))}
          <input
            ref={inputRef}
            className="auth-code__input"
            value={code}
            onChange={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={CODE_LENGTH}
            disabled={verifying}
            aria-label="6-digit code from the email"
            aria-invalid={error ? true : undefined}
          />
        </motion.div>

        <button
          className="auth-btn auth-btn--primary"
          type="submit"
          disabled={code.length !== CODE_LENGTH || busy}
        >
          {verifying ? 'Verifying…' : 'Verify'}
        </button>
      </form>

      <p className="auth-switch">
        Didn&apos;t get it?
        <button
          type="button"
          className="auth-switch__link auth-link-btn"
          onClick={() => void resend()}
          disabled={busy || waitSeconds > 0}
        >
          {waitSeconds > 0 ? `Resend code in ${countdownLabel(waitSeconds)}` : 'Resend code'}
        </button>
      </p>
      <p className="auth-code__hint">Check your spam folder too. The code works for 15 minutes.</p>
      <p className="auth-switch">
        <button type="button" className="auth-switch__link auth-link-btn" onClick={onBack} disabled={verifying}>
          {backLabel}
        </button>
      </p>
    </>
  );
};

export default VerifyEmailStep;
