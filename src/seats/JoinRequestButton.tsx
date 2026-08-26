/**
 * The traveller's side of a listing: ask to come along, or see where your
 * request stands.
 *
 * Deliberately one control with four states rather than a control plus a status
 * line elsewhere. Someone looking at a stranger's trip has exactly one question
 * - "can I come?" - and the answer should be in the place they are already
 * looking.
 */

import React from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  TextField, Typography,
} from '@mui/material';
import { IconCheck, IconClock, IconShieldCheck, IconUserPlus } from '@tabler/icons-react';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import { useRequireAuth } from '../auth/AuthGate';
import { takeDraft } from '../utils/pendingDraft';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { canRequestToJoin, type TripSeats } from './types';
import { useVerification } from './useVerification';

interface JoinRequestButtonProps {
  tripId: string;
  seats: TripSeats;
  isOwner: boolean;
  /** Called after any change, so the parent can refetch seat state. */
  onChanged?: () => void;
  fullWidth?: boolean;
}

const JoinRequestButton: React.FC<JoinRequestButtonProps> = ({
  tripId, seats, isOwner, onChanged, fullWidth,
}) => {
  const requireAuth = useRequireAuth();
  const { token } = useAuthToken();
  const verification = useVerification();

  const [open, setOpen] = React.useState(false);
  const [leaveOpen, setLeaveOpen] = React.useState(false);
  const draftKey = `join-request:${tripId}`;
  const [message, setMessage] = React.useState(() => takeDraft(draftKey) ?? '');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // The remove endpoint takes a target user, and leaving is removing yourself.
  const myUserId = useSelector((s: RootState) => Number(s.user.profile?.id));

  const leave = async () => {
    if (!token || !Number.isFinite(myUserId)) return;
    setBusy(true);
    setError(null);
    try {
      await apiServices.removeTripMember(token, tripId, myUserId);
      setLeaveOpen(false);
      onChanged?.();
    } catch {
      setError('Could not leave that trip. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  // Already involved: report the state, and offer the one action that is still
  // open to you. Leaving used to be possible on the server and nowhere in the
  // app, so a traveller whose plans changed had to ask the organiser to remove
  // them.
  if (seats.viewerStatus === 'active') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, color: 'success.main' }}>
          <IconCheck size={16} stroke={2.4} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>You are on this trip</Typography>
        </Box>
        {!isOwner && (
          <Button size="small" color="inherit" disabled={busy} onClick={() => setLeaveOpen(true)}>
            Leave
          </Button>
        )}

        <Dialog open={leaveOpen} onClose={() => !busy && setLeaveOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Leave this trip?</DialogTitle>
          <DialogContent>
            {/* Said plainly because it is true and not obvious: the server keeps
                the row as `left`, which is what frees your seat AND what stops
                you asking again. Someone who taps this expecting to change their
                mind later would be stuck. */}
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Your place goes back to the organiser straight away. You will not be able to
              ask to join this trip again, so only do this if you are sure.
            </Typography>
            {error && (
              <Typography variant="body2" sx={{ color: 'error.main', mt: 1.5 }}>{error}</Typography>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button color="inherit" onClick={() => setLeaveOpen(false)} disabled={busy}>
              Stay on the trip
            </Button>
            <Button color="error" variant="contained" onClick={() => void leave()} disabled={busy}>
              {busy ? 'Leaving…' : 'Leave'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // Having left, you cannot come back: `canRequestToJoin` refuses any non-null
  // viewer status. Without this the component returned null and the trip simply
  // went quiet, which reads as a bug rather than a decision you made.
  if (seats.viewerStatus === 'left') {
    return (
      <Typography variant="body2" sx={{ color: 'text.disabled' }}>
        You left this trip.
      </Typography>
    );
  }

  if (seats.viewerStatus === 'requested') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, color: 'text.secondary' }}>
          <IconClock size={16} stroke={2} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Request sent</Typography>
        </Box>
        <Button
          size="small"
          color="inherit"
          disabled={busy}
          onClick={async () => {
            if (!token) return;
            setBusy(true);
            try {
              await apiServices.cancelJoinRequest(token, tripId);
              onChanged?.();
            } finally {
              setBusy(false);
            }
          }}
        >
          Withdraw
        </Button>
      </Box>
    );
  }

  // A decline is final. Saying so is kinder than a button that always fails,
  // and it is why the server keeps the row instead of deleting it.
  if (seats.viewerStatus === 'declined') {
    return (
      <Typography variant="body2" sx={{ color: 'text.disabled' }}>
        The organiser could not fit you in on this one.
      </Typography>
    );
  }

  if (!canRequestToJoin(seats, isOwner)) {
    if (seats.spotsLeft === 0) {
      return (
        <Typography variant="body2" sx={{ color: 'text.disabled', fontWeight: 600 }}>
          This trip is full
        </Typography>
      );
    }
    return null;
  }

  if (verification.blocked) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          startIcon={<IconShieldCheck size={16} />}
          disabled={verification.starting}
          onClick={(e) => { e.stopPropagation(); void verification.start(); }}
        >
          {verification.starting ? 'Opening…' : 'Verify to join'}
        </Button>
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          Organisers only meet verified travellers.
        </Typography>
      </Box>
    );
  }

  const send = async () => {
    if (!requireAuth({
      reason: 'Your message is saved. Sign in and your request goes to the organiser.',
      draft: { key: draftKey, text: message },
    }) || !token) return;
    setBusy(true);
    setError(null);
    try {
      await apiServices.requestToJoinTrip(token, tripId, message.trim() || undefined);
      setOpen(false);
      setMessage('');
      onChanged?.();
    } catch {
      setError('That request could not be sent. The trip may have just filled up.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant="contained"
        fullWidth={fullWidth}
        startIcon={<IconUserPlus size={16} />}
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
      >
        Ask to join
      </Button>

      <Dialog
        open={open}
        onClose={() => !busy && setOpen(false)}
        maxWidth="xs"
        fullWidth
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle>Ask to join this trip</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            The organiser decides who comes along. Tell them a little about
            yourself and why this trip.
          </Typography>
          <TextField
            autoFocus
            multiline
            minRows={3}
            maxRows={8}
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 500))}
            placeholder="I have been wanting to do this route for a while…"
            helperText={`${message.length}/500`}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
          />
          {error && (
            <Typography variant="body2" sx={{ color: 'error.main', mt: 1.5 }}>
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void send()} disabled={busy}>
            {busy ? 'Sending…' : 'Send request'}
          </Button>
        </DialogActions>
      </Dialog>

      {seats.pricePerPerson != null && (
        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.disabled' }}>
          {/* Stated plainly, because a price next to a button normally means a
              checkout, and here it emphatically does not. */}
          Costs are settled directly with the organiser. Tripician does not take payment.
        </Typography>
      )}
    </>
  );
};

export default JoinRequestButton;
