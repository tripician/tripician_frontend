import React from 'react';
import { Box, MenuItem, Select, Typography } from '@mui/material';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import { groupsForPlanning } from './groupLogic';
import type { Organization } from './types';

interface TripGroupFieldProps {
  tripId: string;
  organizationId?: string | null;
  onMoved?: (organizationId: string | null) => void;
}

// Owner only: put this plan into one of your groups, or take it out. Moving in shows the plan to the whole group.
const TripGroupField: React.FC<TripGroupFieldProps> = ({ tripId, organizationId, onMoved }) => {
  const { token } = useAuthToken();
  const [groups, setGroups] = React.useState<Organization[]>([]);
  const [current, setCurrent] = React.useState<string>(organizationId ?? '');
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ ok: boolean; text: string } | null>(null);

  React.useEffect(() => { setCurrent(organizationId ?? ''); }, [organizationId]);

  React.useEffect(() => {
    if (!token) return;
    let active = true;
    apiServices.getMyOrganizations(token)
      .then((r) => { if (active) setGroups(groupsForPlanning(Array.isArray(r.data) ? r.data : [])); })
      .catch(() => { if (active) setGroups([]); });
    return () => { active = false; };
  }, [token]);

  const change = async (next: string) => {
    if (next === current) return;
    const target = groups.find((g) => g.id === next);
    if (target && !window.confirm(`Move this plan into ${target.name}? Everyone in the group will be able to see it, and its admins can help run it. Chat stays with the people going.`)) return;

    setBusy(true);
    setMessage(null);
    try {
      await apiServices.moveTripToGroup(tripId, next || null);
      setCurrent(next);
      onMoved?.(next || null);
      setMessage({ ok: true, text: next ? `This plan is now part of ${target?.name ?? 'the group'}.` : 'This plan is personal again.' });
    } catch {
      setMessage({ ok: false, text: 'That could not be changed. You need to be the owner, and able to plan in the group.' });
    } finally {
      setBusy(false);
    }
  };

  // Nothing to choose between: no groups to plan in, and the plan is not in one.
  if (groups.length === 0 && !current) return null;
  const currentIsListed = !current || groups.some((g) => g.id === current);

  return (
    <Box>
      <Select
        size="small"
        fullWidth
        value={current}
        disabled={busy}
        onChange={(e) => void change(String(e.target.value))}
        displayEmpty
        sx={{ borderRadius: '10px' }}
      >
        <MenuItem value="">Personal plan, no group</MenuItem>
        {!currentIsListed && <MenuItem value={current}>Its current group</MenuItem>}
        {groups.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
      </Select>
      {message && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: message.ok ? 'success.main' : 'error.main' }}>
          {message.text}
        </Typography>
      )}
    </Box>
  );
};

export default TripGroupField;
