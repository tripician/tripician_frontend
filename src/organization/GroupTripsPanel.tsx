import React from 'react';
import { Box, Button, Chip, Tooltip, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  IconBook2, IconClock, IconMap2, IconPencil, IconPlus, IconRoute, IconUserPlus, IconUsers,
} from '@tabler/icons-react';
import TripicianAIOrb from '../tripicianai/TripicianAIOrb';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import EmptyState from '../components/ui/EmptyState';
import SectionHeader from '../components/ui/SectionHeader';
import { CardGridSkeleton } from '../components/ui/Skeletons';
import JoinRequestsInbox from '../seats/JoinRequestsInbox';
import { gridSx } from '../pages/CommunityPage/communityConstants';
import { useAppShell } from '../pages/PageLayout/AppShellContext';
import { tripCoverPhoto } from '../utils/tripCover';
import { tripPath } from '../utils/tripSlug';
import { storyPath } from '../afterstory/storySlug';
import { isPastTrip, splitGroupTrips } from './groupLogic';
import { asGroupCredits, runsOrganizationTrips, type GroupCredits, type GroupTrip, type Organization } from './types';

function statusLabel(trip: GroupTrip): string {
  if (trip.status === 2) return 'Completed';
  if (trip.status === 1) return 'Live now';
  if (isPastTrip(trip)) return 'Ended';
  return trip.published ? 'Planning' : 'Draft';
}

function dateRange(trip: GroupTrip): string | null {
  if (!trip.startDate) return null;
  const start = dayjs(trip.startDate);
  const end = trip.endDate ? dayjs(trip.endDate) : null;
  if (!end || end.isSame(start, 'day')) return start.format('D MMM YYYY');
  return start.isSame(end, 'year')
    ? `${start.format('D MMM')} to ${end.format('D MMM YYYY')}`
    : `${start.format('D MMM YYYY')} to ${end.format('D MMM YYYY')}`;
}

type StoryLink = { id: string; slug?: string | null };

// Nobody is put on a group trip without saying so, and nobody joins one without an organiser saying so.
const InterestControl: React.FC<{ trip: GroupTrip; past: boolean }> = ({ trip, past }) => {
  const { token } = useAuthToken();
  const [asked, setAsked] = React.useState(trip.viewerRequestStatus === 'requested');
  const [busy, setBusy] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  const ask = async () => {
    if (!token) return;
    setBusy(true);
    setFailed(false);
    try {
      await apiServices.requestToJoinTrip(token, trip.tripId);
      setAsked(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    if (!token) return;
    setBusy(true);
    setFailed(false);
    try {
      await apiServices.cancelJoinRequest(token, trip.tripId);
      setAsked(false);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  if (asked) {
    return (
      <>
        <Chip size="small" variant="outlined" icon={<IconClock size={14} />} label="Waiting on the organiser" />
        <Button size="small" onClick={() => void withdraw()} disabled={busy} sx={{ textTransform: 'none', fontWeight: 700 }}>
          Withdraw
        </Button>
        {failed && <Typography variant="caption" sx={{ color: 'error.main' }}>That did not go through.</Typography>}
      </>
    );
  }

  // A decline is not shown back to the person: they know, and a card is not the place to remind them.
  if (past || !trip.viewerCanAskToJoin) return null;

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        startIcon={<IconUserPlus size={15} />}
        onClick={() => void ask()}
        disabled={busy}
        sx={{ textTransform: 'none', fontWeight: 700 }}
      >
        Count me in
      </Button>
      {failed && <Typography variant="caption" sx={{ color: 'error.main' }}>That did not go through.</Typography>}
    </>
  );
};

const GroupTripCard: React.FC<{ trip: GroupTrip; past: boolean; story?: StoryLink }> = ({ trip, past, story }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [failed, setFailed] = React.useState(false);
  const cover = failed ? null : tripCoverPhoto({ bannerPhotoUrl: trip.coverUrl, countries: trip.countries });
  const open = () => navigate(tripPath({ id: trip.tripId, name: trip.name }));
  const interested = trip.interestedCount ?? 0;

  return (
    <Box
      sx={{
        display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%',
        borderRadius: '16px', border: `1px solid ${theme.custom.surface.border}`, bgcolor: 'background.paper',
        boxShadow: theme.custom.shadows.card,
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={open}
        aria-label={`Open ${trip.name}`}
        sx={{
          position: 'relative', aspectRatio: '16 / 9', p: 0, border: 'none', cursor: 'pointer',
          bgcolor: theme.custom.surface.active, overflow: 'hidden',
          '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: -2 },
        }}
      >
        {cover ? (
          <Box component="img" src={cover} alt="" loading="lazy" onError={() => setFailed(true)} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'text.disabled' }}><IconMap2 size={28} /></Box>
        )}
        <Chip
          size="small"
          label={statusLabel(trip)}
          sx={{ position: 'absolute', top: 10, left: 10, bgcolor: 'background.paper', color: 'text.primary', fontWeight: 700 }}
        />
      </Box>

      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.25 }}>{trip.name}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {[trip.countries.slice(0, 3).join(', ') || null, dateRange(trip)].filter(Boolean).join(' · ') || 'No dates yet'}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
          <IconUsers size={14} />
          {trip.goingCount} {trip.goingCount === 1 ? 'person' : 'people'} {past ? 'went' : 'going'}
          {trip.ownerName ? ` · planned by ${trip.ownerName}` : ''}
        </Typography>

        <Box sx={{ mt: 'auto', pt: 1.25, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          {trip.viewerOnTrip && <Chip size="small" color="primary" variant="outlined" label={past ? 'You went' : 'You are going'} />}
          {interested > 0 && (
            <Tooltip title="Waiting on you, below">
              <Chip size="small" variant="outlined" icon={<IconUserPlus size={14} />} label={`${interested} interested`} />
            </Tooltip>
          )}
          <Box sx={{ flex: 1 }} />
          {!trip.viewerOnTrip && <InterestControl trip={trip} past={past} />}
          {past && story && (
            <Button size="small" startIcon={<IconBook2 size={15} />} onClick={() => navigate(storyPath(story))} sx={{ textTransform: 'none', fontWeight: 700 }}>
              Read the story
            </Button>
          )}
          {trip.viewerCanEdit && past && !story && (
            <Button size="small" startIcon={<IconPencil size={15} />} onClick={() => navigate(`/tripplanner/${trip.tripId}?tab=story`)} sx={{ textTransform: 'none', fontWeight: 700 }}>
              Write the story
            </Button>
          )}
          {trip.viewerCanEdit && !past && (
            <Button size="small" startIcon={<IconRoute size={15} />} onClick={() => navigate(`/tripplanner/${trip.tripId}`)} sx={{ textTransform: 'none', fontWeight: 700 }}>
              Open planner
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};

interface GroupTripsPanelProps {
  organization: Organization;
  trips: GroupTrip[];
  loading: boolean;
}

// One tab for the group's trips: what is coming up, then where it has already been. Budgets and chat stay on each trip.
const GroupTripsPanel: React.FC<GroupTripsPanelProps> = ({ organization, trips, loading }) => {
  const { openCreateTrip } = useAppShell();
  const newPlan = () => openCreateTrip({ organizationId: organization.id });
  const [credits, setCredits] = React.useState<GroupCredits | null>(null);
  const [stories, setStories] = React.useState<Map<string, StoryLink>>(new Map());
  const plans = organization.canCreatePlans;
  const decides = runsOrganizationTrips(organization);
  const { plans: upcoming, past } = React.useMemo(() => splitGroupTrips(trips), [trips]);

  // Credits matter to the people who start plans; everyone else would only see a number they cannot use.
  React.useEffect(() => {
    if (!plans) return;
    let active = true;
    apiServices.getGroupCredits(organization.id)
      .then((r) => { if (active) setCredits(asGroupCredits(r.data)); })
      .catch(() => { if (active) setCredits(null); });
    return () => { active = false; };
  }, [organization.id, plans]);

  // A trip that already has its story links to it instead of asking for one.
  React.useEffect(() => {
    let active = true;
    apiServices.getGroupStories(organization.id)
      .then((r) => {
        if (!active) return;
        const byTrip = new Map<string, StoryLink>();
        for (const s of Array.isArray(r.data) ? r.data : []) {
          if (s.tripId && !byTrip.has(s.tripId)) byTrip.set(s.tripId, { id: s.id, slug: s.slug });
        }
        setStories(byTrip);
      })
      .catch(() => { if (active) setStories(new Map()); });
    return () => { active = false; };
  }, [organization.id]);

  return (
    <Box>
      {plans && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
          {credits ? (
            <Tooltip title={`When a plan in this group runs out of its own TripicianAI credits, it draws on these.${credits.monthlyCredits > 0 ? ` ${credits.monthlyCredits.toLocaleString('en-IN')} are added each month.` : ''}`}>
              <Chip
                icon={<TripicianAIOrb size={16} />}
                variant="outlined"
                label={`${credits.balance.toLocaleString('en-IN')} shared TripicianAI credits`}
                sx={{ fontWeight: 700 }}
              />
            </Tooltip>
          ) : <Box />}
          <Button variant="contained" startIcon={<IconPlus size={17} />} onClick={newPlan} sx={{ textTransform: 'none', fontWeight: 700 }}>
            New plan in {organization.name}
          </Button>
        </Box>
      )}

      {/* The queue sits with the trips it is about, and only for the people who can answer it. */}
      {decides && <JoinRequestsInbox organizationId={organization.id} />}

      {loading && trips.length === 0 ? (
        <CardGridSkeleton count={3} minWidth={280} />
      ) : (
        <>
          {upcoming.length > 0 ? (
            <Box>
              {past.length > 0 && <SectionHeader title="Coming up" />}
              <Box sx={gridSx}>
                {upcoming.map((t) => <GroupTripCard key={t.tripId} trip={t} past={false} story={stories.get(t.tripId)} />)}
              </Box>
            </Box>
          ) : (
            <EmptyState
              icon={IconRoute}
              title="Nothing planned yet"
              description={plans
                ? 'Start the first one. Everyone in the group can follow along as it takes shape, and say whether they are coming.'
                : 'When someone starts a plan, the whole group can follow it here.'}
              {...(plans ? { actionLabel: 'Start a plan', onAction: newPlan } : {})}
            />
          )}

          {past.length > 0 && (
            <Box sx={{ mt: 5 }}>
              <SectionHeader title="Past trips" subtitle="Where the group has been, and the stories written about it." />
              <Box sx={gridSx}>
                {past.map((t) => <GroupTripCard key={t.tripId} trip={t} past story={stories.get(t.tripId)} />)}
              </Box>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default GroupTripsPanel;
