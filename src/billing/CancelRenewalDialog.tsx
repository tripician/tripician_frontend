import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { cancelRenewalText } from './billingLabels';
import type { BillingSummary } from './types';

interface CancelRenewalDialogProps {
  open: boolean;
  summary: BillingSummary;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

/** Stops the renewal and says what that does and does not refund, in the same terms as section 14 of the Terms. */
const CancelRenewalDialog: React.FC<CancelRenewalDialogProps> = ({ open, summary, onClose, onConfirm }) => {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch {
      setError('The renewal could not be cancelled. Try again in a moment.');
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
      <DialogTitle sx={{ pb: 1 }}>Cancel renewal?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.primary' }}>
          {cancelRenewalText(summary)}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5 }}>
          After 7 days from a payment, cancelling does not refund the period you are in. Within 7 days, you can ask for
          that payment back by emailing support@tripician.com from the address on this account. Section 14 of the Terms
          explains the details.
        </Typography>
        {error && (
          <Typography variant="body2" color="error" role="alert" sx={{ mt: 1.5 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button color="inherit" onClick={onClose} disabled={busy}>Keep my plan</Button>
        <Button variant="contained" color="error" onClick={() => void confirm()} disabled={busy}>
          {busy ? 'Cancelling' : 'Cancel renewal'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CancelRenewalDialog;
