import React from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, Select, TextField, Typography,
} from '@mui/material';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';

const REASONS = [
  { value: 'scam', label: 'Looks like a scam' },
  { value: 'unsafe', label: 'Unsafe or dangerous' },
  { value: 'harassment', label: 'Harassment or abuse' },
  { value: 'impersonation', label: 'Pretending to be someone else' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Something else' },
];

interface ReportTripDialogProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  /** Omit to report the listing rather than a person. */
  reportedUserId?: number;
  reportedName?: string;
}

const ReportTripDialog: React.FC<ReportTripDialogProps> = ({
  open, onClose, tripId, reportedUserId, reportedName,
}) => {
  const { token } = useAuthToken();
  const [reason, setReason] = React.useState('scam');
  const [detail, setDetail] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await apiServices.reportTrip(token, tripId, { reason, detail: detail.trim() || undefined, reportedUserId });
      setDone(true);
    } catch {
      setError('That report could not be sent. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    onClose();
    setTimeout(() => { setDone(false); setDetail(''); setReason('scam'); }, 200);
  };

  return (
    <Dialog open={open} onClose={() => !busy && close()} maxWidth="xs" fullWidth>
      <DialogTitle>
        {reportedName ? `Report ${reportedName}` : 'Report this trip'}
      </DialogTitle>

      {done ? (
        <>
          <DialogContent>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Thank you. Someone on the Tripician team will look at this. We do not
              tell the other person who reported them.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button variant="contained" onClick={close}>Done</Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogContent>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              If you feel unsafe or think money is at risk, report it. Nothing is
              shared with the person you are reporting.
            </Typography>

            <Select
              fullWidth
              size="small"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              sx={{ borderRadius: '12px', mb: 2 }}
            >
              {REASONS.map((r) => (
                <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
              ))}
            </Select>

            <TextField
              multiline
              minRows={3}
              maxRows={8}
              fullWidth
              value={detail}
              onChange={(e) => setDetail(e.target.value.slice(0, 500))}
              placeholder="What happened?"
              helperText={`${detail.length}/500`}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />

            {error && (
              <Typography variant="body2" sx={{ color: 'error.main', mt: 1.5 }}>{error}</Typography>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button color="inherit" onClick={close} disabled={busy}>Cancel</Button>
            <Button variant="contained" color="error" onClick={() => void submit()} disabled={busy}>
              {busy ? 'Sending…' : 'Report'}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};

export default ReportTripDialog;
