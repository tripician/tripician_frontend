import React, { useState } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import {
  Box, Button, Card, CardContent, CircularProgress, IconButton, InputAdornment, TextField, Typography,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { apiServices } from '../../services/APIs/apiServices';
import { authAPI } from '../../services/APIs/Auth/auth';
import { useAuthToken } from '../../hooks/useAuth0Token';
import type { RootState } from '../../store';

const MIN_LENGTH = 8;

type Field = 'current' | 'next' | 'confirm';

/** The server's refusal, as `{ code, message }`, or the rate limiter's plain sentence. */
function readFailure(err: unknown): { code: string | null; message: string } {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { code?: string; message?: string } | string | undefined;
    if (typeof data === 'string' && data.trim()) return { code: err.response?.status === 429 ? 'RATE_LIMITED' : null, message: data };
    if (data && typeof data === 'object' && data.message) return { code: data.code ?? null, message: data.message };
  }
  return { code: null, message: 'Your password couldn’t be changed. Please try again.' };
}

/**
 * Security: changing the password of an email-and-password account.
 *
 * The current password is asked for even though the person is signed in, so a
 * session left open on a shared computer is not enough to take the account.
 * The server answers with fresh tokens minted under the new password, and they
 * replace this session's, so changing it never signs you out here. An account
 * that signs in with Google has no Tripician password, and is told so.
 */
const ChangePasswordCard: React.FC = () => {
  const { kind, login } = useAuthToken();
  const email = useSelector((state: RootState) => state.user.profile?.email ?? '');

  const [values, setValues] = useState<Record<Field, string>>({ current: '', next: '', confirm: '' });
  const [shown, setShown] = useState<Record<Field, boolean>>({ current: false, next: false, confirm: false });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notSet, setNotSet] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetNote, setResetNote] = useState<string | null>(null);
  const [sendingReset, setSendingReset] = useState(false);

  const set = (field: Field) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setFormError(null);
  };

  const validate = (): boolean => {
    const next: Partial<Record<Field, string>> = {};
    if (!values.current) next.current = 'Enter your current password.';
    if (values.next.length < MIN_LENGTH) next.next = `Use at least ${MIN_LENGTH} characters.`;
    else if (values.next === values.current) next.next = 'Choose a password different from the current one.';
    if (!next.next && values.confirm !== values.next) next.confirm = 'This doesn’t match the new password.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !validate()) return;
    setSaving(true);
    setFormError(null);
    try {
      const { data } = await apiServices.changePassword(values.current, values.next);
      // The new session replaces this one, so the change never signs you out here.
      if (data?.accessToken) login(data.accessToken, data.refreshToken ?? undefined, 'password');
      setValues({ current: '', next: '', confirm: '' });
      setShown({ current: false, next: false, confirm: false });
      window.dispatchEvent(new CustomEvent('app:success', { detail: { message: 'Password changed' } }));
    } catch (err) {
      const { code, message } = readFailure(err);
      if (code === 'WRONG_PASSWORD') setErrors({ current: message });
      else if (code === 'WEAK_PASSWORD') setErrors({ next: message });
      else if (code === 'PASSWORD_NOT_SET') setNotSet(message);
      else setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  const sendReset = async () => {
    if (!email || sendingReset) return;
    setSendingReset(true);
    try {
      await authAPI.forgotPassword(email);
      setResetNote(`We’ve emailed a link to ${email} to set a new password.`);
    } catch {
      setResetNote('The reset email couldn’t be sent. Please try again in a moment.');
    } finally {
      setSendingReset(false);
    }
  };

  const field = (name: Field, label: string, autoComplete: string, helper?: string) => (
    <TextField
      fullWidth
      label={label}
      type={shown[name] ? 'text' : 'password'}
      value={values[name]}
      onChange={set(name)}
      autoComplete={autoComplete}
      size="small"
      disabled={saving}
      error={!!errors[name]}
      helperText={errors[name] ?? helper}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              onClick={() => setShown((s) => ({ ...s, [name]: !s[name] }))}
              edge="end"
              size="small"
              aria-label={shown[name] ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            >
              {shown[name] ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        ),
      }}
      sx={{ mb: 2.5, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
    />
  );

  const social = kind === 'social' || notSet !== null;

  return (
    <Card sx={{ borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: 3 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', mb: social ? 1 : 3, color: 'text.primary', letterSpacing: '-0.01em' }}>
          Security
        </Typography>

        {social ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {notSet ?? 'You sign in with Google, so there is no Tripician password to change. Change it in your Google account.'}
          </Typography>
        ) : (
          <Box component="form" onSubmit={submit} noValidate>
            {/* A hidden username lets password managers file the new password under the right account. */}
            <input type="text" name="username" autoComplete="username" value={email} readOnly hidden />
            {field('current', 'Current password', 'current-password')}
            {field('next', 'New password', 'new-password', `At least ${MIN_LENGTH} characters. Mix upper and lower case letters and a number.`)}
            {field('confirm', 'Confirm new password', 'new-password')}

            {formError ? (
              <Typography variant="body2" sx={{ color: 'error.main', mb: 2 }} role="alert">{formError}</Typography>
            ) : null}

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
              <Button
                type="button"
                variant="text"
                size="small"
                onClick={() => void sendReset()}
                disabled={!email || sendingReset}
                sx={{ textTransform: 'none', fontWeight: 500, px: 0 }}
              >
                {sendingReset ? 'Sending…' : 'Forgot your current password?'}
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
                sx={{ textTransform: 'none', fontWeight: 600, px: 3, py: 1, borderRadius: 1.5 }}
              >
                {saving ? 'Changing…' : 'Change password'}
              </Button>
            </Box>
            {resetNote ? (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5 }}>{resetNote}</Typography>
            ) : null}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ChangePasswordCard;
