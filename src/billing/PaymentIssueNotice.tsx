import React from 'react';
import { Box, Button, LinearProgress, Link, Typography, alpha, useTheme, type SxProps, type Theme } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { IconAlertTriangle } from '@tabler/icons-react';
import { issueBillingPath, paymentNotice, type PaymentFixAction } from './paymentIssue';
import { usePaymentFix } from './usePaymentFix';
import type { PaymentIssue } from './types';

interface PaymentIssueNoticeProps {
  /** The failed renewal to show. Nothing renders without one, except the outcome of a payment just made for it. */
  issue: PaymentIssue | null | undefined;
  /** Adds the "Billing settings" link, for a page that is not where the plan is managed. */
  billingLink?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * A failed renewal, said where plans are managed: at the top of Billing, above
 * the plans on Pricing, and in the group's own plan panel. The popup's words and
 * fixes, without "Not now", because on these screens there is nothing to put off.
 *
 * Render it whether or not there is an issue: it keeps saying how a payment went
 * after the list has already dropped the issue that payment fixed.
 */
const PaymentIssueNotice: React.FC<PaymentIssueNoticeProps> = ({ issue, billingLink = false, sx }) => {
  const theme = useTheme();
  const titleId = React.useId();
  const fix = usePaymentFix();
  // The issue a payment is being made for, held while the list refreshes underneath it.
  const [held, setHeld] = React.useState<PaymentIssue | null>(null);
  const shown = issue ?? (fix.busy !== null || fix.paid ? held : null);
  if (!shown) return null;

  const notice = paymentNotice(shown);
  const working = fix.busy !== null;
  const start = (action: PaymentFixAction) => {
    setHeld(shown);
    void fix.run(action, shown);
  };

  const box = {
    p: { xs: 2, sm: 2.5 },
    borderRadius: '16px',
    border: `1px solid ${alpha(theme.palette.error.main, 0.45)}`,
    bgcolor: alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.12 : 0.06),
  } as const;

  // Paid: only the outcome is left to say.
  if (fix.paid) {
    return (
      <Box sx={[box, ...(Array.isArray(sx) ? sx : [sx])]}>
        <Typography variant="body2" role="status" sx={{ color: 'text.primary', fontWeight: 600 }}>{fix.message}</Typography>
        {fix.busy === 'settling' && <LinearProgress aria-hidden sx={{ mt: 1.5, height: 4, borderRadius: 2 }} />}
      </Box>
    );
  }

  return (
    <Box role="region" aria-labelledby={titleId} sx={[box, ...(Array.isArray(sx) ? sx : [sx])]}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
        <Box component="span" sx={{ color: 'error.main', display: 'inline-flex', mt: '2px', flexShrink: 0 }}>
          <IconAlertTriangle size={18} stroke={2} aria-hidden />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography id={titleId} sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'text.primary' }}>{notice.title}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, maxWidth: 600 }}>{notice.body}</Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.25, mt: 2, pl: { sm: 3.5 } }}>
        <Button
          variant="contained"
          color="error"
          onClick={() => start(notice.primary.action)}
          disabled={working}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {fix.busy === notice.primary.action ? 'Opening' : notice.primary.label}
        </Button>
        {notice.secondary && (
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => start(notice.secondary!.action)}
            disabled={working}
            sx={{ textTransform: 'none' }}
          >
            {fix.busy === notice.secondary.action ? 'Opening' : notice.secondary.label}
          </Button>
        )}
        {billingLink && (
          <Link component={RouterLink} to={issueBillingPath(shown)} sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
            Billing settings
          </Link>
        )}
      </Box>

      {fix.error && (
        <Typography variant="body2" color="error" role="alert" sx={{ mt: 1.5, pl: { sm: 3.5 } }}>{fix.error}</Typography>
      )}
      {fix.message && !fix.error && (
        <Typography variant="body2" role="status" sx={{ color: 'text.secondary', mt: 1.5, pl: { sm: 3.5 } }}>{fix.message}</Typography>
      )}
    </Box>
  );
};

export default PaymentIssueNotice;
