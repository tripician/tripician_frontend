/**
 * The organisation control panel: every trip this organisation runs, and what
 * its members are allowed to see on each.
 *
 * Deliberately a view over the per-trip settings rather than a second set of
 * switches. An org admin toggling budget here writes the same column the trip
 * owner writes in the planner, so the two can never disagree about the answer.
 */

import React from 'react';
import {
  Avatar, Box, Button, Chip, CircularProgress, Typography, useTheme,
} from '@mui/material';
import dayjs from 'dayjs';
import { IconMap2, IconPlus, IconUserPlus } from '@tabler/icons-react';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import { useAppShell } from '../pages/PageLayout/AppShellContext';
import EmptyState from '../components/ui/EmptyState';
import SegmentedControl from '../components/ui/SegmentedControl';
import StaffTripDialog from './StaffTripDialog';
import { runsOrganizationTrips, hasFeature, PLAN_FEATURES } from './types';
import type { TripFeatureVisibility } from '../utils/normalizeTrip';
import type { Organization, OrganizationTrip } from './types';

const VISIBILITY_OPTIONS: { value: TripFeatureVisibility; label: string }[] = [
  { value: 'admins', label: 'Admins only' },
  { value: 'members', label: 'Everyone on the trip' },
];

interface OrganizationTripsPanelProps {
  organizationId: string;
  /** Passed on the workspace, where the panel also creates and staffs trips. */
  organization?: Organization;
}

const OrganizationTripsPanel: React.FC<OrganizationTripsPanelProps> = ({ organizationId, organization }) => {
  const theme = useTheme();
  const { token } = useAuthToken();
  const { openCreateTrip } = useAppShell();

  const [trips, setTrips] = React.useState<OrganizationTrip[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busyTripId, setBusyTripId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [staffing, setStaffing] = React.useState<OrganizationTrip | null>(null);

  const canRunTrips = runsOrganizationTrips(organization);
  const canStaff = canRunTrips && hasFeature(organization, PLAN_FEATURES.staffing);

  const load = React.useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const resp = await apiServices.getOrganizationTrips(token, organizationId);
      setTrips(Array.isArray(resp.data) ? resp.data : []);
    } catch {
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, [token, organizationId]);

  React.useEffect(() => { void load(); }, [load]);

  const setVisibility = async (
    trip: OrganizationTrip,
    key: 'budgetVisibility' | 'checklistVisibility',
    value: TripFeatureVisibility,
  ) => {
    if (!token) return;
    setBusyTripId(trip.tripId);
    setError(null);

    // Optimistic: the switch should move under the finger, not after a round trip.
    const previous = trips;
    setTrips((rows) => rows.map((r) => (r.tripId === trip.tripId ? { ...r, [key]: value } : r)));

    try {
      await apiServices.updateTripSettings(token, trip.tripId, {
        [key]: value,
      } as Record<string, unknown>);
    } catch {
      setTrips(previous);
      setError('That could not be saved. Please try again.');
    } finally {
      setBusyTripId(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  const newTripButton = canRunTrips ? (
    <Button
      variant="contained"
      size="small"
      startIcon={<IconPlus size={15} />}
      onClick={() => openCreateTrip({ organizationId })}
      sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '50px', justifySelf: 'start' }}
    >
      New trip for {organization?.name ?? 'this organization'}
    </Button>
  ) : null;

  if (trips.length === 0) {
    return (
      <Box sx={{ display: 'grid', gap: 2, justifyItems: 'center' }}>
        <EmptyState
          icon={IconMap2}
          title="No trips yet"
          description="Trips created under this organization appear here, with control over what their members can see."
        />
        {newTripButton}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Announcements, the plan and the after story are always visible to everyone on a trip.
        Budget and checklist are yours to decide.
      </Typography>

      {newTripButton}

      {trips.map((trip) => (
        <Box
          key={trip.tripId}
          sx={{
            p: 2.25, borderRadius: '16px',
            border: `1px solid ${theme.custom.surface.border}`,
            bgcolor: 'background.paper',
            opacity: busyTripId === trip.tripId ? 0.6 : 1,
          }}
        >
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <Avatar
              src={trip.coverUrl ?? undefined}
              variant="rounded"
              sx={{ width: 52, height: 52, borderRadius: '12px', bgcolor: 'primary.main' }}
            >
              {trip.name.charAt(0).toUpperCase()}
            </Avatar>

            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography
                  component="a"
                  href={`/trip/${trip.tripId}`}
                  variant="subtitle1"
                  sx={{ color: 'text.primary', textDecoration: 'none' }}
                >
                  {trip.name}
                </Typography>
                {!trip.published && <Chip size="small" variant="outlined" label="Draft" />}
              </Box>

              <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', mt: 0.25 }}>
                {[
                  trip.startDate ? dayjs(trip.startDate).format('D MMM YYYY') : null,
                  `${trip.crewCount} ${trip.crewCount === 1 ? 'person' : 'people'}`,
                ].filter(Boolean).join(' · ')}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gap: 1.5, mt: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 0.5 }}>
                Budget
              </Typography>
              <SegmentedControl
                value={trip.budgetVisibility}
                options={VISIBILITY_OPTIONS}
                onChange={(value) => void setVisibility(trip, 'budgetVisibility', value)}
              />
            </Box>

            <Box>
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 0.5 }}>
                Checklist
              </Typography>
              <SegmentedControl
                value={trip.checklistVisibility}
                options={VISIBILITY_OPTIONS}
                onChange={(value) => void setVisibility(trip, 'checklistVisibility', value)}
              />
            </Box>

            {canStaff && (
              <Button
                size="small"
                startIcon={<IconUserPlus size={15} />}
                onClick={() => setStaffing(trip)}
                sx={{ textTransform: 'none', fontWeight: 700, justifySelf: 'start' }}
              >
                Put someone on this trip
              </Button>
            )}
          </Box>
        </Box>
      ))}

      {error && <Typography variant="body2" color="error">{error}</Typography>}

      {organization && (
        <StaffTripDialog
          organization={organization}
          trip={staffing}
          onClose={() => setStaffing(null)}
          onStaffed={() => { setStaffing(null); void load(); }}
        />
      )}
    </Box>
  );
};

export default OrganizationTripsPanel;
