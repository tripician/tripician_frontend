import React from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import { IconArrowRight, IconCheck, IconLock, IconUserPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useRequireAuth } from '../auth/AuthGate';
import { apiServices } from '../services/APIs/apiServices';
import { serverMessage, serverStatus } from '../utils/apiError';
import { groupHomePath, groupJoinState, joinRefusalPatch } from './groupLogic';
import type { OrganizationPublic } from './types';

// The one control on a group's public page: open it, ask to join it, or see where your request stands.
const JoinGroupButton: React.FC<{ group: OrganizationPublic; onChange: (patch: Partial<OrganizationPublic>) => void }> = ({ group, onChange }) => {
  const navigate = useNavigate();
  const requireAuth = useRequireAuth();
  const [asking, setAsking] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const state = groupJoinState(group);

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiServices.requestToJoinGroup(group.id, message.trim() || undefined);
      onChange({ viewerRequestStatus: 'pending' });
      setAsking(false);
    } catch (err) {
      // The server knows where this person stands. A settled answer closes the
      // dialog and changes the button; only a retryable one stays on screen.
      const patch = joinRefusalPatch(serverStatus(err));
      if (patch) {
        onChange(patch);
        setAsking(false);
      } else {
        setError(serverMessage(err) ?? 'That request could not be sent. Try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      await apiServices.cancelGroupRequest(group.id);
      onChange({ viewerRequestStatus: null });
    } finally {
      setBusy(false);
    }
  };

  if (state === 'business') return null;

  if (state === 'member') {
    return (
      <Button variant="contained" endIcon={<IconArrowRight size={16} />} onClick={() => navigate(groupHomePath(group.id))} sx={{ textTransform: 'none', fontWeight: 700 }}>
        Open group
      </Button>
    );
  }

  if (state === 'invite_only') {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary', display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
        <IconLock size={16} /> Invite only
      </Typography>
    );
  }

  if (state === 'pending') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Button variant="outlined" disabled startIcon={<IconCheck size={16} />} sx={{ textTransform: 'none', fontWeight: 700 }}>
          Request sent
        </Button>
        <Button onClick={() => void cancel()} disabled={busy} sx={{ textTransform: 'none', color: 'text.secondary' }}>
          Cancel request
        </Button>
      </Box>
    );
  }

  if (state === 'full') {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        This group is full right now.
      </Typography>
    );
  }

  if (state === 'declined') {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        The group could not take you in this time.
      </Typography>
    );
  }

  return (
    <>
      <Button
        variant="contained"
        startIcon={<IconUserPlus size={17} />}
        onClick={() => { if (requireAuth({ reason: `Ask to join ${group.name} to see its plans and stories.` })) setAsking(true); }}
        sx={{ textTransform: 'none', fontWeight: 700 }}
      >
        Ask to join
      </Button>
      <Dialog open={asking} onClose={() => setAsking(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: '18px' } }}>
        <DialogTitle>Ask to join {group.name}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 1.5 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            An admin looks at every request. Once you are in, you see the group's plans and stories. Going on a trip is still decided trip by trip.
          </Typography>
          <TextField
            label="A note for the admins (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 500))}
            multiline
            minRows={3}
            fullWidth
            helperText={`${message.length}/500`}
          />
          {error && <Typography variant="body2" color="error">{error}</Typography>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setAsking(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void send()} disabled={busy}>{busy ? 'Sending' : 'Send request'}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default JoinGroupButton;
