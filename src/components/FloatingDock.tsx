import React, { useState } from 'react';
import { Box, Fab, Tooltip, Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Collapse, Divider, List, ListItem, ListItemIcon, ListItemText, Alert, Snackbar, useTheme } from '@mui/material';
import FeedbackIcon from '@mui/icons-material/Feedback';
import UpdateIcon from '@mui/icons-material/Update';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
// Import version from package.json (tsconfig resolveJsonModule enabled)
import pkg from '../../package.json';

// Fallback email
const FEEDBACK_EMAIL = import.meta.env.VITE_FEEDBACK_EMAIL || 'tripicianofficial@gmail.com';
// Optional backend endpoint for feedback POST (future). If not provided we fallback to mailto link.
const FEEDBACK_ENDPOINT = import.meta.env.VITE_FEEDBACK_ENDPOINT as string | undefined;

interface FeatureItem {
  title: string;
  description: string;
}

// Curate latest features here; keep concise. Could later be fetched from remote.
const latestFeatures: FeatureItem[] = [
  { title: 'Route Optimization', description: 'Finds an efficient order for your destinations with a single click.' },
  { title: 'Nights Allocation Cap', description: 'Prevents overbooking nights beyond your trip total.' },
  { title: 'Destination Management', description: 'Add, remove, and adjust nights per destination seamlessly.' },
  { title: 'Theme Support', description: 'Light and dark theme toggling for comfortable viewing.' },
];

export const FloatingDock: React.FC = () => {
  const theme = useTheme();
  const [open, setOpen] = useState(true); // dock expanded state
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState<{open: boolean; message: string; severity: 'success' | 'error'}>({open:false, message:'', severity:'success'});

  const handleSendFeedback = async () => {
    if (!subject.trim() && !message.trim()) {
      setSnack({open:true, message: 'Please enter a subject or message before sending.', severity:'error'});
      return;
    }
    // If backend endpoint configured attempt POST else open mail client
    if (!FEEDBACK_ENDPOINT) {
      const mailto = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
      window.location.href = mailto;
      setFeedbackOpen(false);
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(FEEDBACK_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message }),
      });
      if (!res.ok) throw new Error('Failed to send');
      setSnack({open:true, message: 'Feedback sent. Thank you!', severity:'success'});
      setSubject('');
      setMessage('');
      setFeedbackOpen(false);
    } catch (e:any) {
      setSnack({open:true, message: 'Error sending feedback. Please try again or use direct email.', severity:'error'});
    } finally {
      setSubmitting(false);
    }
  };

  const dockBg = theme.palette.mode === 'dark' ? theme.palette.background.paper : '#ffffffcc';

  return (
    <>
  <Box sx={{ position: 'fixed', right: 24, bottom: 96, zIndex: 1800, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <Paper elevation={6} sx={{ p: 1, bgcolor: dockBg, backdropFilter: 'blur(6px)', borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Tooltip title={open ? 'Collapse Dock' : 'Expand Dock'} arrow>
            <IconButton size="small" onClick={() => setOpen(o => !o)} aria-label={open ? 'collapse-dock' : 'expand-dock'} sx={{ mb: open ? 1 : 0 }}>
              {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Tooltip>
          <Collapse orientation="vertical" in={open} unmountOnExit timeout={300}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Tooltip title="Send Feedback" arrow placement="left">
                <Fab color="primary" size="small" onClick={() => setFeedbackOpen(true)} aria-label="feedback">
                  <FeedbackIcon />
                </Fab>
              </Tooltip>
              <Tooltip title="Latest Updates" arrow placement="left">
                <Fab size="small" onClick={() => setUpdatesOpen(true)} aria-label="updates" sx={{ bgcolor: theme.palette.info.main, color: theme.palette.info.contrastText, '&:hover': { bgcolor: theme.palette.info.dark } }}>
                  <UpdateIcon />
                </Fab>
              </Tooltip>
            </Box>
          </Collapse>
        </Paper>
      </Box>

      {/* Feedback Dialog */}
      <Dialog open={feedbackOpen} onClose={() => !submitting && setFeedbackOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Send Feedback</DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }} icon={<MailOutlineIcon />}>Your feedback goes directly to our team at <strong>{FEEDBACK_EMAIL}</strong>.</Alert>
          <TextField autoFocus margin="dense" label="Subject" fullWidth variant="outlined" value={subject} onChange={e => setSubject(e.target.value)} disabled={submitting} />
          <TextField margin="dense" label="Message" fullWidth variant="outlined" value={message} onChange={e => setMessage(e.target.value)} multiline minRows={5} disabled={submitting} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackOpen(false)} disabled={submitting}>Cancel</Button>
          <Button variant="contained" onClick={handleSendFeedback} disabled={submitting}>{submitting ? 'Sending...' : 'Send'}</Button>
        </DialogActions>
      </Dialog>

      {/* Updates Dialog */}
      <Dialog open={updatesOpen} onClose={() => setUpdatesOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <UpdateIcon />
          <span>What&apos;s New</span>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>Version: {pkg.version}</Typography>
          <List dense>
            {latestFeatures.map(f => (
              <ListItem key={f.title} alignItems="flex-start" sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <UpdateIcon fontSize="small" color="action" />
                </ListItemIcon>
                <ListItemText primary={f.title} secondary={f.description} />
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="body2" color="text.secondary">
            We iterate rapidly. Have ideas? Hit the Feedback button! 🚀
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button startIcon={<FeedbackIcon />} onClick={() => { setUpdatesOpen(false); setFeedbackOpen(true); }}>Give Feedback</Button>
          <Button variant="contained" onClick={() => setUpdatesOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({...s, open:false}))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({...s, open:false}))}>{snack.message}</Alert>
      </Snackbar>
    </>
  );
};

export default FloatingDock;
