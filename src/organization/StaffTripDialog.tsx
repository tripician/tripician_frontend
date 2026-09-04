import React from 'react';
import {
  Avatar, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, Select, Typography,
} from '@mui/material';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import type { Organization, OrganizationMember, OrganizationTrip } from './types';

interface StaffTripDialogProps {
  organization: Organization;
  trip: OrganizationTrip | null;
  onClose: () => void;
  onStaffed: () => void;
}

/**
 * Puts one organisation member onto one of its trips.
 *
 * The only bridge between the two memberships, and deliberately explicit: it
 * writes a real TripMembers row rather than making belonging to the organisation
 * mean being on its trips.
 */
const StaffTripDialog: React.FC<StaffTripDialogProps> = ({ organization, trip, onClose, onStaffed }) => {
  const { token } = useAuthToken();

  const [members, setMembers] = React.useState<OrganizationMember[]>([]);
  const [userId, setUserId] = React.useState<number | ''>('');
  const [role, setRole] = React.useState('member');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token || !trip) return;
    let active = true;
    apiServices.getOrganizationMembers(token, organization.id)
      .then((r) => { if (active) setMembers(Array.isArray(r.data) ? r.data : []); })
      .catch(() => { if (active) setMembers([]); });
    return () => { active = false; };
  }, [token, trip, organization.id]);

  React.useEffect(() => {
    if (!trip) { setUserId(''); setRole('member'); setError(null); }
  }, [trip]);

  const submit = async () => {
    if (!token || !trip || userId === '') return;
    setBusy(true);
    setError(null);
    try {
      await apiServices.staffOrganizationTrip(token, organization.id, trip.tripId, userId, role);
      onStaffed();
    } catch {
      setError('That person could not be added to the trip.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={trip !== null}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { borderRadius: '18px' } }}
    >
      <DialogTitle>Put someone on {trip?.name}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Only people who already belong to {organization.name}. This adds them to the
          trip itself, which is a separate thing from belonging to the organization.
        </Typography>

        <Select
          size="small"
          displayEmpty
          value={userId}
          onChange={(e) => setUserId(Number(e.target.value) || '')}
          sx={{ borderRadius: '12px' }}
        >
          <MenuItem value="" disabled>Choose someone</MenuItem>
          {members.map((m) => (
            <MenuItem key={m.userId} value={m.userId}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar src={m.avatarUrl ?? undefined} sx={{ width: 22, height: 22, fontSize: 11 }}>
                  {(m.name ?? '?').charAt(0).toUpperCase()}
                </Avatar>
                {m.name ?? `User ${m.userId}`}
              </Box>
            </MenuItem>
          ))}
        </Select>

        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
            Their role on the trip
          </Typography>
          <Select size="small" fullWidth value={role} onChange={(e) => setRole(e.target.value)} sx={{ borderRadius: '12px' }}>
            <MenuItem value="member">Member, discussion only</MenuItem>
            <MenuItem value="admin">Admin, can edit the plan and settings</MenuItem>
          </Select>
        </Box>

        {members.length === 0 && (
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            Nobody belongs to this organization yet. Add people on the People tab first.
          </Typography>
        )}

        {error && <Typography variant="body2" color="error">{error}</Typography>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={busy} sx={{ borderRadius: '12px' }}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => void submit()}
          disabled={busy || userId === ''}
          sx={{ borderRadius: '12px' }}
        >
          {busy ? 'Adding' : 'Add to trip'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StaffTripDialog;
