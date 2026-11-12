import React from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import { serverMessage } from '../utils/apiError';
import { firstName, type ChatJoinRequest } from './chatApi';

// The join request between the two, decided where the conversation is happening.
const DecisionBar: React.FC<{
  joinRequest: ChatJoinRequest;
  otherUserId: number;
  otherName: string | null;
  sx?: object;
}> = ({ joinRequest, otherUserId, otherName, sx }) => {
  const theme = useTheme();
  const { token } = useAuthToken();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [outcome, setOutcome] = React.useState<string | null>(null);
  const who = firstName(otherName) || 'them';
  const trip = joinRequest.tripName ?? 'this trip';

  if (joinRequest.direction === 'my-request') {
    return (
      <Box sx={{ px: 1.5, py: 1, bgcolor: theme.custom.surface.brandTint, flexShrink: 0, ...sx }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Your request to join {trip} is waiting for {who} to decide.
        </Typography>
      </Box>
    );
  }

  const decide = async (approve: boolean) => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      if (approve) await apiServices.approveJoinRequest(token, joinRequest.tripId, otherUserId);
      else await apiServices.declineJoinRequest(token, joinRequest.tripId, otherUserId);
      setOutcome(approve ? `${who} is on the trip.` : 'Request declined.');
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
            Wants to join {trip}
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
