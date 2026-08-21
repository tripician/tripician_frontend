/**
 * Who is waiting on you, across every trip you organise.
 *
 * Requests were previously visible only by opening each trip's own public page,
 * one at a time - so an organiser with three listed trips had to visit three
 * pages to find out whether anybody had asked, and somebody waiting on an answer
 * was invisible unless the organiser went looking.
 *
 * Renders NOTHING when there is nothing pending. This is an inbox, not a
 * feature announcement: a permanent empty section on a profile would be a
 * standing reminder that nobody wants to come.
 */

import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { IconInbox } from '@tabler/icons-react';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import JoinRequestRow from './JoinRequestRow';
import { describeSpots } from './types';
import type { PendingRequestsGroup } from './types';

const JoinRequestsInbox: React.FC = () => {
  const theme = useTheme();
  const { token } = useAuthToken();

  const [groups, setGroups] = React.useState<PendingRequestsGroup[]>([]);
  const [busyKey, setBusyKey] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!token) return;
    try {
      const resp = await apiServices.getPendingJoinRequests(token);
      setGroups(Array.isArray(resp.data) ? resp.data : []);
    } catch {
      // An inbox that cannot load must not take the profile down with it.
      setGroups([]);
    }
  }, [token]);

  React.useEffect(() => { void load(); }, [load]);

  const decide = async (tripId: string, userId: number, approve: boolean) => {
    if (!token) return;
    setBusyKey(`${tripId}:${userId}`);
    setError(null);
    try {
      if (approve) await apiServices.approveJoinRequest(token, tripId, userId);
      else await apiServices.declineJoinRequest(token, tripId, userId);
      setGroups((prev) =>
        prev
          .map((g) => (g.tripId === tripId ? { ...g, requests: g.requests.filter((r) => r.userId !== userId) } : g))
          .filter((g) => g.requests.length > 0),
      );
    } catch {
      // By far the likeliest cause is the last seat going while this was open,
      // so the message names that rather than saying something went wrong.
      setError(
        approve
          ? 'Could not approve that request. The trip may now be full.'
          : 'Could not decline that request.',
      );
      void load();
    } finally {
      setBusyKey(null);
    }
  };

  const total = groups.reduce((n, g) => n + g.requests.length, 0);
  if (total === 0) return null;

  return (
    <Box
      sx={{
        mt: 4, p: { xs: 2, sm: 2.5 },
        borderRadius: '20px',
        border: `1px solid ${theme.custom.surface.border}`,
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <IconInbox size={18} stroke={1.8} />
        <Typography variant="h4" component="h2">
          {total === 1 ? '1 person is waiting on you' : `${total} people are waiting on you`}
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        You approve everyone who joins. Nothing happens until you decide.
      </Typography>

      {error && (
        <Typography variant="body2" sx={{ color: 'error.main', mb: 1.5 }}>{error}</Typography>
      )}

      <Box sx={{ display: 'grid', gap: 1.5 }}>
        {groups.map((g) =>
          g.requests.map((r, i) => (
            <JoinRequestRow
              key={r.id}
              request={r}
              // The trip name leads the first row of each group; repeating it on
              // every row of the same trip is noise.
              tripName={i === 0
                ? [g.tripName, describeSpots({ spotsLeft: g.spotsLeft })].filter(Boolean).join('  ·  ')
                : undefined}
              busy={busyKey === `${g.tripId}:${r.userId}`}
              onDecide={(userId, approve) => void decide(g.tripId, userId, approve)}
            />
          )),
        )}
      </Box>
    </Box>
  );
};

export default JoinRequestsInbox;
