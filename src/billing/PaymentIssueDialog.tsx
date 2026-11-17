import React from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Link, Typography,
} from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useAuthToken } from '../hooks/useAuth0Token';
import { isCheckoutOpen, subscribeCheckout } from '../payments/razorpay';
import { tokenSubject } from '../utils/authSession';
import { usePaymentIssues, usePaymentIssueSync } from './billingStatus';
import {
  asSnoozes, issueBillingPath, paymentNotice, pickIssueToShow, routeIssueContext, snoozeIssue,
  type PaymentFixAction, type PaymentSnoozes,
} from './paymentIssue';
import { usePaymentFix } from './usePaymentFix';
import type { PaymentIssue } from './types';

/** How long after the app is up the popup waits, so it never lands on the first paint. */
const SHOW_AFTER_MS = 1500;

/** Per account: "Not now" on one account says nothing about another. Sign-out clears it with the rest. */
const SNOOZE_KEY_PREFIX = 'tripician.billing.snooze.';

function readSnoozes(subject: string | null): PaymentSnoozes {
  if (!subject) return {};
  try {
    const raw = localStorage.getItem(SNOOZE_KEY_PREFIX + subject);
    return raw ? asSnoozes(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

function writeSnoozes(subject: string | null, snoozes: PaymentSnoozes): void {
  if (!subject) return;
  try {
    localStorage.setItem(SNOOZE_KEY_PREFIX + subject, JSON.stringify(snoozes));
  } catch { /* private mode or quota: the snooze lasts until the page reloads */ }
}

const IssuePrompt: React.FC<{ subject: string | null }> = ({ subject }) => {
  const location = useLocation();
  const issues = usePaymentIssues();
  const checkoutOpen = React.useSyncExternalStore(subscribeCheckout, isCheckoutOpen, isCheckoutOpen);
  const fix = usePaymentFix();
  const bodyId = React.useId();

  const [ready, setReady] = React.useState(false);
  const [snoozes, setSnoozes] = React.useState<PaymentSnoozes>(() => readSnoozes(subject));
  // The issue a payment is being made for, held while the list refreshes underneath it.
  const [held, setHeld] = React.useState<PaymentIssue | null>(null);
  // The last issue on screen, so the dialog keeps its words while it fades out.
  const [display, setDisplay] = React.useState<PaymentIssue | null>(null);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), SHOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const now = new Date();
  const context = { ...routeIssueContext(location.pathname, location.search), checkoutOpen };
  const working = fix.busy !== null || fix.paid;
  const candidate = working && held ? held : ready ? pickIssueToShow(issues, snoozes, now, context) : null;
  // A held issue is still kept off Billing, its group's settings and an open payment sheet.
  const open = candidate !== null && pickIssueToShow([candidate], {}, now, context) !== null;
  if (candidate && candidate !== display) setDisplay(candidate);

  const issue = candidate ?? display;
  if (!issue) return null;
  const notice = paymentNotice(issue, now);

  // "Not now", Escape and the backdrop all put this issue off for a day.
  const close = () => {
    const next = snoozeIssue(snoozes, issue, new Date());
    setSnoozes(next);
    writeSnoozes(subject, next);
    setHeld(null);
    fix.reset();
  };

  const start = (action: PaymentFixAction) => {
    setHeld(issue);
    void fix.run(action, issue);
  };

  const opening = fix.busy === 'card' || fix.busy === 'pay';

  return (
    <Dialog
      open={open}
      onClose={close}
      fullWidth
      maxWidth="xs"
      aria-describedby={fix.paid ? undefined : bodyId}
      PaperProps={{ sx: { borderRadius: '18px' } }}
    >
      {fix.paid ? (
        <>
          {/* Paid: what is left to say is how it went, read out as it changes. */}
          <DialogTitle sx={{ pb: 1 }} aria-live="polite">{fix.message}</DialogTitle>
          <DialogContent>
            {fix.busy === 'settling' && <LinearProgress aria-hidden sx={{ height: 4, borderRadius: 2 }} />}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button variant="contained" onClick={close} autoFocus sx={{ textTransform: 'none', fontWeight: 700 }}>Close</Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogTitle sx={{ pb: 1 }}>{notice.title}</DialogTitle>
          <DialogContent>
            <Typography id={bodyId} variant="body2" sx={{ color: 'text.primary' }}>{notice.body}</Typography>
            {fix.error && (
              <Typography variant="body2" color="error" role="alert" sx={{ mt: 1.5 }}>{fix.error}</Typography>
            )}
            {fix.message && !fix.error && (
              <Typography variant="body2" role="status" sx={{ color: 'text.secondary', mt: 1.5 }}>{fix.message}</Typography>
            )}
            <Box sx={{ mt: 2 }}>
              <Link
                component={RouterLink}
                to={issueBillingPath(issue)}
                sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                Billing settings
              </Link>
            </Box>
          </DialogContent>
          {/* Three buttons do not fit across a phone, so there they stack with the fix on top. */}
          <DialogActions
            disableSpacing
            sx={{
              px: 3,
              pb: 2.5,
              gap: 1,
              flexDirection: { xs: 'column-reverse', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'center' },
            }}
          >
            <Button color="inherit" onClick={close} sx={{ textTransform: 'none', mr: { sm: 'auto' } }}>{notice.dismiss}</Button>
            {notice.secondary && (
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => start(notice.secondary!.action)}
                disabled={opening}
                sx={{ textTransform: 'none' }}
              >
                {fix.busy === notice.secondary.action ? 'Opening' : notice.secondary.label}
              </Button>
            )}
            <Button
              variant="contained"
              color="error"
              onClick={() => start(notice.primary.action)}
              disabled={opening}
              autoFocus
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              {fix.busy === notice.primary.action ? 'Opening' : notice.primary.label}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};

/**
 * The popup for a renewal payment that failed, mounted once for signed-in people.
 *
 * It asks about one issue at a time, about 1.5 s after the app is up: update the
 * card or pay another way while Razorpay still retries, pay again once it has
 * stopped. It stays away from Billing, Pricing and the group's own settings tab,
 * which say the same thing inline, and from an open payment sheet.
 */
const PaymentIssueDialog: React.FC = () => {
  const { token } = useAuthToken();
  const subject = tokenSubject(token);
  usePaymentIssueSync(subject);
  // Keyed by account, so one account's snoozes and half-made payment never carry into another's session.
  return <IssuePrompt key={subject ?? 'unknown'} subject={subject} />;
};

export default PaymentIssueDialog;
