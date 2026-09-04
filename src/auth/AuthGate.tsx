import React from 'react';
import { Box, Button, Dialog, Typography } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthToken } from '../hooks/useAuth0Token';
import { withNext } from '../services/APIs/Auth/nextDestination';
import { stashDraft } from '../utils/pendingDraft';

export interface RequireAuthOptions {
  /** One line saying what they were about to do. Shown in the dialog. */
  reason?: string;
  /**
   * Typed text to hold across sign-in, with the key the composer will ask for
   * on the way back. Omit for one-tap actions: restoring those would perform
   * something after a redirect that the person may no longer intend.
   */
  draft?: { key: string; text: string; meta?: string };
}

interface AuthGateValue {
  /**
   * True when the caller may proceed. False means the visitor is signed out and
   * the dialog has been raised, so the caller should return.
   */
  requireAuth: (options?: RequireAuthOptions) => boolean;
}

const AuthGateContext = React.createContext<AuthGateValue | null>(null);

/**
 * The one sign-in prompt, for every public surface that has an input.
 *
 * Deliberately its own provider rather than a member of AppShellContext, which
 * is mounted inside NavigationPanel and therefore does not reach /trip/:id,
 * /story/:id, /o/:slug, /pricing, /blog or the info pages - four of the places
 * that need this most. This is mounted above the router instead.
 *
 * It is not an embedded login form. Auth is a redirect, and the social path
 * reloads the document, so the honest thing is a dialog that says what is about
 * to happen and hands over the two real doors.
 */
export const AuthGateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuthToken();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState<string | null>(null);

  // Read through a ref so `requireAuth` keeps a stable identity: it ends up in
  // the dependency list of nearly every submit handler in the app.
  const tokenRef = React.useRef(token);
  tokenRef.current = token;
  const hereRef = React.useRef('');
  hereRef.current = `${location.pathname}${location.search}`;

  const requireAuth = React.useCallback((options?: RequireAuthOptions) => {
    if (tokenRef.current) return true;

    if (options?.draft?.text?.trim()) {
      stashDraft(options.draft.key, options.draft.text, hereRef.current, options.draft.meta);
    }
    setReason(options?.reason ?? null);
    setOpen(true);
    return false;
  }, []);

  const go = (path: string) => {
    setOpen(false);
    navigate(withNext(path, hereRef.current));
  };

  const value = React.useMemo(() => ({ requireAuth }), [requireAuth]);

  return (
    <AuthGateContext.Provider value={value}>
      {children}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px', p: 0.5 } }}
      >
        <Box sx={{ px: { xs: 3, sm: 3.5 }, py: { xs: 3, sm: 3.5 } }}>
          <Typography variant="h5" component="h2" sx={{ color: 'text.primary', mb: 1 }}>
            Join the conversation
          </Typography>

          <Typography sx={{ fontSize: '0.875rem', lineHeight: 1.55, color: 'text.secondary', mb: 3 }}>
            {reason ?? 'You need an account for this.'}
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.25 }}>
            <Button
              variant="contained"
              fullWidth
              onClick={() => go('/signin')}
              sx={{ borderRadius: '50px', py: 1.1, textTransform: 'none', fontWeight: 700 }}
            >
              Sign in
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => go('/signup')}
              sx={{ borderRadius: '50px', py: 1.1, textTransform: 'none', fontWeight: 700 }}
            >
              Create account
            </Button>
          </Box>
        </Box>
      </Dialog>
    </AuthGateContext.Provider>
  );
};

/**
 * Returns `requireAuth`. Call it at the top of a submit handler:
 * `if (!requireAuth({ reason: '...' })) return;`
 *
 * Never gate on focus. The input stays typeable for a guest, and the prompt
 * arrives when they try to send.
 */
export function useRequireAuth(): AuthGateValue['requireAuth'] {
  const ctx = React.useContext(AuthGateContext);
  // No provider means a test or a stray render tree. Refusing silently would be
  // worse than the old behaviour, so fall back to letting the caller proceed and
  // hit the server's own 401.
  return ctx?.requireAuth ?? (() => true);
}
