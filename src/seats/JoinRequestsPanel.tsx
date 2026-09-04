/**
 * The organiser's side: who has asked, and the decision.
 *
 * Approve and decline are both single, explicit actions on a named person. There
 * is no bulk accept and no "approve all", because the entire safety argument for
 * this feature is that a human looked at each applicant. A button that waves
 * through six strangers at once quietly removes the thing that made it defensible.
 */

import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { IconInbox } from '@tabler/icons-react';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import JoinRequestRow from './JoinRequestRow';
import type { TripJoinRequest, TripSeats } from './types';

interface JoinRequestsPanelProps {
  tripId: string;
  seats: TripSeats;
  onChanged?: () => void;
}

const JoinRequestsPanel: React.FC<JoinRequestsPanelProps> = ({ tripId, seats, onChanged }) => {
  const theme = useTheme();
  const { token } = useAuthToken();

  const [requests, setRequests] = React.useState<TripJoinRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busyUserId, setBusyUserId] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const resp = await apiServices.getJoinRequests(token, tripId);
      setRequests(Array.isArray(resp.data) ? resp.data : []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [token, tripId]);

  React.useEffect(() => { void load(); }, [load]);

  const decide = async (userId: number, approve: boolean) => {
    if (!token) return;
    setBusyUserId(userId);
    setError(null);
    try {
      if (approve) await apiServices.approveJoinRequest(token, tripId, userId);
      else await apiServices.declineJoinRequest(token, tripId, userId);
      setRequests((prev) => prev.filter((r) => r.userId !== userId));
      onChanged?.();
    } catch {
      // The most likely cause by far is the last seat going while this panel was
      // open, so the message names it rather than saying "something went wrong".
      setError(
        approve
          ? 'Could not approve that request. The trip may now be full.'
          : 'Could not decline that request.',
      );
      void load();
    } finally {
      setBusyUserId(null);
    }
  };

  if (loading) return null;

  if (requests.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          p: 2.5, borderRadius: '16px',
          border: `1px solid ${theme.custom.surface.border}`,
          color: 'text.secondary',
        }}
      >
        <IconInbox size={20} stroke={1.7} />
        <Typography variant="body2">
          {seats.joinPolicy === 'OpenToRequests'
            ? 'No requests yet. Your trip is listed and open.'
            : 'Open this trip for requests and travellers can ask to join.'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      {error && (
        <Typography variant="body2" sx={{ color: 'error.main' }}>{error}</Typography>
      )}

      {requests.map((r) => (
        <JoinRequestRow
          key={r.id}
          request={r}
          busy={busyUserId === r.userId}
          onDecide={(userId, approve) => void decide(userId, approve)}
        />
      ))}
    </Box>
  );
};

export default JoinRequestsPanel;
