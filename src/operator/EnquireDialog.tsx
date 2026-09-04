import React from 'react';
import {
  Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, TextField, Typography, useTheme,
} from '@mui/material';
import { IconExternalLink } from '@tabler/icons-react';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import { safeExternalUrl } from '../utils/sanitizeHtml';
import type { OperatorLeadResult } from './types';

interface EnquireDialogProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  companyName: string;
}

/**
 * The one place a traveller's contact details leave Tripician.
 *
 * Consent is an unticked box and the button stays disabled until it is ticked.
 * The copy names exactly what is sent and to whom, because a vague "I agree" on
 * a disclosure to a third-party business is not consent.
 */
const EnquireDialog: React.FC<EnquireDialogProps> = ({ open, onClose, tripId, companyName }) => {
  const theme = useTheme();
  const { token } = useAuthToken();

  const [consent, setConsent] = React.useState(false);
  const [partySize, setPartySize] = React.useState('1');
  const [message, setMessage] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<OperatorLeadResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    if (!token || !consent) return;
    setBusy(true);
    setError(null);
    try {
      const resp = await apiServices.enquireAboutTrip(token, tripId, {
        consent: true,
        partySize: Math.max(1, Number(partySize) || 1),
        message: message.trim() || undefined,
      });
      setResult(resp.data);
    } catch {
      setError('That enquiry could not be sent. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    onClose();
    setTimeout(() => {
      setResult(null); setConsent(false); setMessage(''); setPartySize('1'); setError(null);
    }, 200);
  };

  const bookingUrl = result?.website ? safeExternalUrl(result.website) : null;

  return (
    <Dialog open={open} onClose={() => !busy && close()} maxWidth="xs" fullWidth>
      <DialogTitle>{result ? `${result.companyName} has your details` : `Enquire with ${companyName}`}</DialogTitle>

      {result ? (
        <>
          <DialogContent>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              They will be in touch. To book, go to their own site. Tripician does
              not take payment for this trip.
            </Typography>
            {bookingUrl && (
              <Button
                variant="contained"
                fullWidth
                component="a"
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<IconExternalLink size={15} />}
              >
                Continue on {result.companyName}
              </Button>
            )}
            {result.contactEmail && (
              <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', mt: 1.5 }}>
                Or email them directly: {result.contactEmail}
              </Typography>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={close}>Done</Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogContent>
            <TextField
              size="small"
              type="number"
              label="How many of you?"
              value={partySize}
              onChange={(e) => setPartySize(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' }, mb: 2, width: 160 }}
            />
            <TextField
              multiline
              minRows={2}
              maxRows={6}
              fullWidth
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 500))}
              placeholder="Anything they should know? (optional)"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />

            <Box
              sx={{
                mt: 2, p: 1.75, borderRadius: '12px',
                border: `1px solid ${theme.custom.surface.border}`,
              }}
            >
              <FormControlLabel
                control={<Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} />}
                label={
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Send my <strong>name and email address</strong> to {companyName} so they
                    can contact me about this trip.
                  </Typography>
                }
                sx={{ alignItems: 'flex-start', m: 0, '& .MuiCheckbox-root': { pt: 0 } }}
              />
            </Box>

            {error && (
              <Typography variant="body2" sx={{ color: 'error.main', mt: 1.5 }}>{error}</Typography>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button color="inherit" onClick={close} disabled={busy}>Cancel</Button>
            <Button variant="contained" onClick={() => void submit()} disabled={busy || !consent}>
              {busy ? 'Sending…' : 'Send enquiry'}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};

export default EnquireDialog;
