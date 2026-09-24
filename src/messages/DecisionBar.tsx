import React from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import { serverMessage } from '../utils/apiError';
import type { Conversation } from './types';

const firstName = (name: string | null | undefined) => name?.trim().split(' ')[0] || 'them';

// The join request a thread is about, decided where the conversation is happening.
const DecisionBar: React.FC<{ conversation: Conversation; outcome?: string; onDecided: (outcome: string) => void; sx?: object }> = ({ conversation, outcome, onDecided, sx }) => {
  const theme = useTheme();
  const { token } = useAuthToken();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (conversation.pending === 'my-request') {
    return (
      <Box sx={{ px: 1.5, py: 1, bgcolor: theme.custom.surface.brandTint, flexShrink: 0, ...sx }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Your request to join {conversation.tripName ?? 'this trip'} is waiting for {firstName(conversation.otherName)} to decide.
        </Typography>
      </Box>
    );
  }
  if (conversation.pending !== 'their-request') return null;

  const decide = async (approve: boolean) => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      if (approve) await apiServices.approveJoinRequest(token, conversation.tripId, conversation.otherUserId);
      else await apiServices.declineJoinRequest(token, conversation.tripId, conversation.otherUserId);
      onDecided(approve ? `${firstName(conversation.otherName)} is on the trip.` : 'Request declined.');
    } catch (err) {
      setError(serverMessage(err) ?? 'That did not save. The trip may be full or the request withdrawn.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ px: 1.5, py: 1, bgcolor: theme.custom.surface.brandTint, flexShrink: 0, ...sx }}>
      {outcome ? (
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>{outcome}</Typography>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ flex: 1, minWidth: 0, color: 'text.primary', fontWeight: 600 }}>
            Wants to join this trip
          </Typography>
          <Button size="small" variant="contained" disabled={busy} onClick={() => void decide(true)} sx={{ textTransform: 'none', fontWeight: 700, minWidth: 0, px: 1.5 }}>
            Approve
          </Button>
          <Button size="small" disabled={busy} onClick={() => void decide(false)} sx={{ textTransform: 'none', color: 'text.secondary', minWidth: 0 }}>
            Decline
          </Button>
        </Box>
      )}
      {error && <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>{error}</Typography>}
    </Box>
  );
};

export default DecisionBar;
