import React from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Radio, RadioGroup, TextField, Typography,
} from '@mui/material';

const REASONS = [
  { value: 'spam', label: 'Spam or advertising' },
  { value: 'offensive', label: 'Offensive or hateful' },
  { value: 'misleading', label: 'Misleading or made up' },
  { value: 'copyright', label: 'Uses my photos or writing' },
  { value: 'other', label: 'Something else' },
] as const;

interface ReportDialogProps {
  open: boolean;
  /** "story", "post": named in the title. */
  noun: string;
  onSubmit: (reason: string, detail?: string) => Promise<void>;
  onClose: () => void;
  fieldSx?: object;
  /** A surface with its own voice (stories) passes its title style. */
  titleSx?: object;
}

// Reporting anything people publish. Closes on a thank-you and never reports the outcome back, so moderation state cannot be probed.
const ReportDialog: React.FC<ReportDialogProps> = ({ open, noun, onSubmit, onClose, fieldSx, titleSx }) => {
  const [reason, setReason] = React.useState<string>('spam');
  const [detail, setDetail] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setReason('spam');
    setDetail('');
    setSent(false);
    setError(null);
  }, [open]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSubmit(reason, detail.trim() || undefined);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send that report.');
    } finally {
      setBusy(false);
    }
  };

  return (
    // Portalled, but React still bubbles clicks up the tree, so a dialog opened from a clickable card must stop them.
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth onClick={(e) => e.stopPropagation()}>
      <DialogTitle sx={{ fontWeight: 700, ...titleSx }}>
        {sent ? 'Thanks for telling us' : `Report this ${noun}`}
      </DialogTitle>

      <DialogContent>
        {sent ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            A moderator will read it. We do not pass on who reported what.
          </Typography>
        ) : (
          <Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              What is wrong with it?
            </Typography>
            <RadioGroup value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => (
                <FormControlLabel
                  key={r.value}
                  value={r.value}
                  control={<Radio size="small" />}
                  label={<Typography variant="body2">{r.label}</Typography>}
                />
              ))}
            </RadioGroup>
            <TextField
              fullWidth
              multiline
              minRows={2}
              size="small"
              placeholder="Anything that would help (optional)"
              value={detail}
              onChange={(e) => setDetail(e.target.value.slice(0, 500))}
              sx={{ mt: 1.5, ...fieldSx }}
            />
            {error && (
              <Typography variant="caption" sx={{ color: 'error.main', mt: 1, display: 'block' }}>{error}</Typography>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        {sent ? (
          <Button variant="contained" onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button onClick={onClose} color="inherit" disabled={busy}>Cancel</Button>
            <Button variant="contained" color="error" onClick={() => void submit()} disabled={busy}>
              {busy ? 'Sending' : 'Send report'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ReportDialog;
