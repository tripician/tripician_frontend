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
  Avatar, Box, Chip, CircularProgress, Typography, useTheme,
} from '@mui/material';
import dayjs from 'dayjs';
import { IconMap2 } from '@tabler/icons-react';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import EmptyState from '../components/ui/EmptyState';
import SegmentedControl from '../components/ui/SegmentedControl';
import type { TripFeatureVisibility } from '../utils/normalizeTrip';
import type { OrganizationTrip } from './types';

const VISIBILITY_OPTIONS: { value: TripFeatureVisibility; label: string }[] = [
  { value: 'admins', label: 'Admins only' },
  { value: 'members', label: 'Everyone on the trip' },
];

const OrganizationTripsPanel: React.FC<{ organizationId: string }> = ({ organizationId }) => {
  const theme = useTheme();
  const { token } = useAuthToken();

  const [trips, setTrips] = React.useState<OrganizationTrip[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busyTripId, setBusyTripId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

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

  if (trips.length === 0) {
    return (
      <EmptyState
        icon={IconMap2}
        title="No trips yet"
        description="Trips created under this organization appear here, with control over what their members can see."
      />
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Announcements, the plan and the after story are always visible to everyone on a trip.
        Budget and checklist are yours to decide.
      </Typography>

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
          </Box>
        </Box>
      ))}

      {error && <Typography variant="body2" color="error">{error}</Typography>}
    </Box>
  );
};

export default OrganizationTripsPanel;
