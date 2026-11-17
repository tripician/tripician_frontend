import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { serverMessage } from '../utils/apiError';
import { cancelRenewalText, isFailedPayment, type CancelSubject } from './billingLabels';

interface CancelRenewalDialogProps {
  open: boolean;
  /** The plan being cancelled: a billing summary and a group's subscription both fit. */
  summary: CancelSubject;
  /** Set for a group's plan, which words the dialog for the group rather than the account. */
  groupName?: string | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

/**
 * Stops the renewal and says what that does and does not refund, in the same terms as section 14 of the Terms.
 *
 * A renewal that failed is different: there is no paid time ahead to keep, so it
 * is the subscription that stops, now, and there is nothing to refund.
 */
const CancelRenewalDialog: React.FC<CancelRenewalDialogProps> = ({ open, summary, groupName, onClose, onConfirm }) => {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const failed = isFailedPayment(summary.status);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      // The server's own reason when it gave one: "There is no subscription to cancel." says more than "try again".
      setError(serverMessage(err) ?? (failed
        ? 'The subscription could not be cancelled. Try again in a moment.'
        : 'The renewal could not be cancelled. Try again in a moment.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { borderRadius: '18px' } }}
    >
      <DialogTitle sx={{ pb: 1 }}>{failed ? 'Cancel subscription?' : 'Cancel renewal?'}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.primary' }}>
          {cancelRenewalText(summary, new Date(), groupName)}
        </Typography>
        {!failed && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5 }}>
            After 7 days from a payment, cancelling does not refund the period you are in. Within 7 days, you can ask for
            that payment back by emailing support@tripician.com from the address on this account. Section 14 of the Terms
            explains the details.
          </Typography>
        )}
        {error && (
          <Typography variant="body2" color="error" role="alert" sx={{ mt: 1.5 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button color="inherit" onClick={onClose} disabled={busy}>{failed ? 'Go back' : 'Keep my plan'}</Button>
        <Button variant="contained" color="error" onClick={() => void confirm()} disabled={busy}>
          {busy ? 'Cancelling' : failed ? 'Cancel subscription' : 'Cancel renewal'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CancelRenewalDialog;
