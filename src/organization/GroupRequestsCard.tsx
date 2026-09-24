import React from 'react';
import { Avatar, Box, Button, Typography, useTheme } from '@mui/material';
import { apiServices } from '../services/APIs/apiServices';
import { serverMessage } from '../utils/apiError';
import type { GroupJoinRequest, Organization } from './types';

// People asking to join a public group. Admins decide one at a time; there is no approve-all on purpose.
const GroupRequestsCard: React.FC<{ organization: Organization; onDecided: () => void }> = ({ organization, onDecided }) => {
  const theme = useTheme();
  const border = theme.custom.surface.border;
  const [requests, setRequests] = React.useState<GroupJoinRequest[]>([]);
  const [busyId, setBusyId] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    try {
      const r = await apiServices.getGroupRequests(organization.id);
      setRequests(Array.isArray(r.data) ? r.data : []);
    } catch {
      setRequests([]);
    }
  }, [organization.id]);

  React.useEffect(() => { void load(); }, [load]);

  const decide = async (userId: number, approve: boolean) => {
    setBusyId(userId);
    try {
      await apiServices.decideGroupRequest(organization.id, userId, approve);
      setRequests((prev) => prev.filter((r) => r.userId !== userId));
      if (approve) onDecided();
    } catch (err) {
      window.dispatchEvent(new CustomEvent('app:error', { detail: { message: serverMessage(err) ?? 'That did not save. Try again.' } }));
    } finally {
      setBusyId(null);
    }
  };

  if (requests.length === 0) return null;

  return (
    <Box sx={{ borderRadius: '16px', border: `1px solid ${border}`, bgcolor: 'background.paper', overflow: 'hidden' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, px: 2, pt: 1.75, pb: 1 }}>
        {requests.length} {requests.length === 1 ? 'person wants' : 'people want'} to join
      </Typography>
      {requests.map((r) => (
        // On a phone the buttons drop under the note, so the note is not squeezed into a three-word column.
        <Box key={r.userId} sx={{ display: 'flex', flexWrap: { xs: 'wrap', sm: 'nowrap' }, alignItems: 'flex-start', gap: 1.5, px: 2, py: 1.5, borderTop: `1px solid ${border}` }}>
          <Avatar src={r.avatarUrl ?? undefined} sx={{ width: 36, height: 36 }}>{(r.name ?? '?').charAt(0).toUpperCase()}</Avatar>
          <Box sx={{ flex: 1, minWidth: { xs: 'calc(100% - 52px)', sm: 0 } }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{r.name ?? 'A traveller'}</Typography>
            {r.message && <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25, whiteSpace: 'pre-line' }}>{r.message}</Typography>}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, pl: { xs: 6, sm: 0 } }}>
            <Button size="small" variant="contained" disabled={busyId === r.userId} onClick={() => void decide(r.userId, true)} sx={{ textTransform: 'none', fontWeight: 700 }}>
              Approve
            </Button>
            <Button size="small" disabled={busyId === r.userId} onClick={() => void decide(r.userId, false)} sx={{ textTransform: 'none', color: 'text.secondary' }}>
              Decline
            </Button>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default GroupRequestsCard;
