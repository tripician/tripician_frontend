/**
 * Reporting a story.
 *
 * Open to signed-out readers on purpose. Requiring an account to flag something
 * harmful puts friction on exactly the wrong side, and the endpoint is rate
 * limited rather than gated.
 *
 * The dialog closes on a thank-you rather than reporting back what happened to
 * the story. Telling a reporter the outcome would let anyone probe moderation
 * state, and it invites arguing with the result.
 */

import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { afterStoryService } from './afterStoryService';
import { STORY_FIELD_SX } from './storyFormat';

interface ReportStoryDialogProps {
  open: boolean;
  storyId: string;
  onClose: () => void;
}

const REASONS = [
  { value: 'spam', label: 'Spam or advertising' },
  { value: 'offensive', label: 'Offensive or hateful' },
  { value: 'misleading', label: 'Misleading or made up' },
  { value: 'copyright', label: 'Uses my photos or writing' },
  { value: 'other', label: 'Something else' },
] as const;

const ReportStoryDialog: React.FC<ReportStoryDialogProps> = ({ open, storyId, onClose }) => {
  const theme = useTheme();
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
      await afterStoryService.report(storyId, reason, detail.trim() || undefined);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send that report.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontFamily: theme.custom.fontDisplay, fontWeight: 700 }}>
        {sent ? 'Thanks for telling us' : 'Report this story'}
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
              sx={{ mt: 1.5, ...STORY_FIELD_SX }}
            />

            {error && (
              <Typography variant="caption" sx={{ color: 'error.main', mt: 1, display: 'block' }}>
                {error}
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        {sent ? (
          <Button variant="contained" onClick={onClose}>
            Done
          </Button>
        ) : (
          <>
            <Button onClick={onClose} color="inherit" disabled={busy}>
              Cancel
            </Button>
            <Button variant="contained" color="error" onClick={() => void submit()} disabled={busy}>
              {busy ? 'Sending...' : 'Send report'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ReportStoryDialog;
