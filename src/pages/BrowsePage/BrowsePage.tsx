// /stories: Groups & Stories. Trips you can join, the groups that run them, and every published plan and story.
import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Link as RouterLink, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import {
  IconBuildingCommunity, IconCompass, IconDice5, IconRosetteDiscountCheck, IconSearch, IconUsersGroup, IconUsersPlus, IconX,
} from '@tabler/icons-react';
import Seo, { SITE_URL } from '../../components/Seo';
import PageHeader from '../../components/ui/PageHeader';
import FilterChip from '../../components/ui/FilterChip';
import SegmentedControl from '../../components/ui/SegmentedControl';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import ScrollRail from '../../components/ui/ScrollRail';
import { CardGridSkeleton } from '../../components/ui/Skeletons';
import CountryFlag from '../../components/ui/CountryFlag';
import WallTripCard from '../CommunityPage/WallTripCard';
import CommunityTripCard from '../CommunityPage/CommunityTripCard';
import StoryCard from '../../afterstory/cards/StoryCard';
import StoryStrip from '../../afterstory/cards/StoryStrip';
import OrganizationCard from '../../organization/OrganizationCard';
import YourGroupsStrip from '../../organization/YourGroupsStrip';
import { openTripsByOrganization, useOrganizationDirectory } from '../../organization/useOrganizationDirectory';
import { CONTENT_MAX, gridSx, wallGridSx } from '../CommunityPage/communityConstants';
import { usePublishedTrips } from '../CommunityPage/usePublishedTrips';
import { usePublishedStories } from '../CommunityPage/usePublishedStories';
import { compareTripsForFeed, isJoinable } from '../../utils/tripRanking';
import { tripPath } from '../../utils/tripSlug';
import { storyPath } from '../../afterstory/storySlug';
import { useAppShell } from '../PageLayout/AppShellContext';
import { searchHref } from '../SearchPage/searchParams';
import FilterMenuChip, { type FilterMenuOption } from './FilterMenuChip';
import VibeStrip from './VibeStrip';
import {
  LENGTHS,
  filtersFromParams,
  filtersToParams,
  hasActiveFilters,
  matchStory,
  matchTrip,
  mixFeed,
  plansOnly,
  type BrowseFilters,
  type Kind,
  type LengthKey,
  vibesIn,
} from './browseFilters';

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'join', label: 'Join a trip' },
  { value: 'groups', label: 'Groups' },
  { value: 'plans', label: 'Plans' },
  { value: 'stories', label: 'Stories' },
];

const LENGTH_OPTIONS: FilterMenuOption<LengthKey>[] = LENGTHS
  .map((l) => ({ value: l.key, label: l.label, hint: l.range }));

const PAGE_SIZE = 24;
const RAIL_ITEMS = 12;

const DestinationChip: React.FC<{
  name: string;
  onClick: () => void;
  removable?: boolean;
}> = ({ name, onClick, removable = false }) => (
  <Box
    component="button"
    type="button"
    onClick={onClick}
    aria-label={removable ? `Remove ${name}` : `Show ${name}`}
    sx={(theme) => ({
      display: 'inline-flex', alignItems: 'center', gap: 0.75, flexShrink: 0,
      height: 34, pl: 0.75, pr: removable ? 1 : 1.5, borderRadius: 999,
      border: `1px solid ${removable ? 'transparent' : theme.custom.surface.border}`,
      bgcolor: removable ? 'text.primary' : 'background.paper',
      color: removable ? 'background.paper' : 'text.primary',
      fontFamily: 'inherit', fontSize: 13, fontWeight: 600, lineHeight: 1,
      cursor: 'pointer',
      transition: `all ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
      '&:hover': removable ? {} : { borderColor: 'text.disabled' },
      '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
    })}
  >
    <CountryFlag country={name} size={20} variant="circle" />
    {name}
    {removable && <IconX size={14} stroke={2} />}
  </Box>
);

// The text an old /stories?q= link carried, shown so it can be seen and removed now the page has no search box.
const QueryChip: React.FC<{ q: string; onRemove: () => void }> = ({ q, onRemove }) => (
  <Box
    component="button"
    type="button"
    onClick={onRemove}
    aria-label={`Remove search for ${q}`}
    sx={(theme) => ({
      display: 'inline-flex', alignItems: 'center', gap: 0.75, flexShrink: 0,
      height: 34, px: 1.25, borderRadius: 999, border: 'none',
      bgcolor: 'text.primary', color: 'background.paper',
      fontFamily: 'inherit', fontSize: 13, fontWeight: 600, lineHeight: 1, cursor: 'pointer',
      '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
    })}
  >
    <IconSearch size={14} stroke={2} />
    {q}
    <IconX size={14} stroke={2} />
  </Box>
);

const RailSection: React.FC<{ title: string; subtitle: string; onSeeAll?: () => void; children: React.ReactNode }> = ({
  title, subtitle, onSeeAll, children,
}) => (
  <Box component="section" sx={{ mt: { xs: 4, md: 5 } }}>
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, mb: 2 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h4" component="h2" noWrap>{title}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>{subtitle}</Typography>
      </Box>
      <Box sx={{ flex: 1 }} />
      {onSeeAll && (
        <Button size="small" onClick={onSeeAll} sx={{ flexShrink: 0 }}>See all</Button>
      )}
    </Box>
    <ScrollRail gap={2} ariaLabel={title}>{children}</ScrollRail>
  </Box>
);

const BrowsePage: React.FC = () => {
  const navigate = useNavigate();
  const { openCreateTrip } = useAppShell();
  const { trips, loading: tripsLoading, error, reload } = usePublishedTrips();
  const { stories, loading: storiesLoading } = usePublishedStories();
  const { organizations, loading: groupsLoading } = useOrganizationDirectory();

  const [searchParams, setSearchParams] = useSearchParams();
  const filters = React.useMemo(() => filtersFromParams(searchParams), [searchParams]);

  const setFilters = React.useCallback((patch: Partial<BrowseFilters>) => {
    setSearchParams((prev) => filtersToParams({ ...filtersFromParams(prev), ...patch }), { replace: true });
  }, [setSearchParams]);

  const [shown, setShown] = React.useState(PAGE_SIZE);
  React.useEffect(() => { setShown(PAGE_SIZE); }, [searchParams]);

  const filteredTrips = React.useMemo(
    () => trips.filter((t) => matchTrip(t, filters)).sort(compareTripsForFeed),
    [trips, filters],
  );
  const filteredStories = React.useMemo(
    () => stories.filter((s) => matchStory(s, filters)),
    [stories, filters],
  );
  const items = React.useMemo(() => mixFeed(filteredTrips, filteredStories), [filteredTrips, filteredStories]);

  const joinable = React.useMemo(() => trips.filter((t) => isJoinable(t)).sort(compareTripsForFeed), [trips]);
  const openByGroup = React.useMemo(() => openTripsByOrganization(trips, (t) => isJoinable(t)), [trips]);
  const editorsPicks = React.useMemo(
    () => stories
      .filter((s) => s.editorsPickAt)
      .sort((a, b) => (Date.parse(b.editorsPickAt ?? '') || 0) - (Date.parse(a.editorsPickAt ?? '') || 0)),
    [stories],
  );
  // Vibes counted from what this tab can show, so each tab offers only vibes it can fill.
  const presentVibes = React.useMemo(() => vibesIn(
    filters.kind === 'stories' ? [] : filters.kind === 'join' ? joinable : trips,
    filters.kind === 'all' || filters.kind === 'stories' ? stories : [],
  ), [filters.kind, trips, joinable, stories]);

  // Travellers moved to Search; an old link lands on the People tab with its query, not on an empty page.
  if (searchParams.get('kind') === 'travellers') {
    return <Navigate to={searchHref({ tab: 'people', q: searchParams.get('q') ?? '' })} replace />;
  }

  const kind = filters.kind;
  const showGroups = kind === 'groups';
  const showPlanFilters = kind !== 'stories';
  const filtering = hasActiveFilters(filters);
  const showRails = kind === 'all' && !filtering;
  const loading = tripsLoading || storiesLoading;
  const visible = items.slice(0, shown);

  const setKind = (next: Kind) => {
    // Stories carry no length, spots or verified mark, so those would leave the Stories tab empty for no visible reason.
    setFilters(next === 'stories' ? { kind: next, length: null, open: false, verified: false } : { kind: next });
  };

  const clearAll = () => {
    setFilters({ q: '', place: null, vibe: null, length: null, open: false, verified: false });
  };

  const openTrip = (trip: any) => {
    const id = trip?.id || trip?.Id;
    // The trip rides along in router state so the trip page paints before its own fetch lands.
    if (id) navigate(tripPath({ id, name: trip.name }), { state: { trip } });
  };

  // A random plan or story from whatever is showing, filters included.
  const surprise = () => {
    const pick = items[Math.floor(Math.random() * items.length)];
    if (!pick) return;
    if (pick.kind === 'trip') openTrip(pick.data);
    else navigate(storyPath(pick.data));
  };

  const countLine = kind === 'join'
    ? `${filteredTrips.length} ${filteredTrips.length === 1 ? 'trip' : 'trips'} you can ask to join`
    : [
      filteredTrips.length > 0 ? `${filteredTrips.length} ${filteredTrips.length === 1 ? 'plan' : 'plans'}` : null,
      filteredStories.length > 0 ? `${filteredStories.length} ${filteredStories.length === 1 ? 'story' : 'stories'}` : null,
    ].filter(Boolean).join(' and ');

  const emptyCopy = kind === 'join'
    ? { title: 'Nobody is looking for people right now', description: 'When an organiser opens a trip to join requests, it shows up here first.' }
    : filtering
      ? { title: 'Nothing matches that', description: 'Try a different place or loosen a filter.' }
      : { title: 'Nothing published yet', description: 'When travellers publish their plans and write them up, they show up here.' };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Seo
        title="Groups & Stories: Trips To Join, Travel Groups, Plans And Stories"
        description="Join a trip that is looking for people, find the travel groups that run them, and read after stories about how real trips went. Every published plan, by destination, vibe and length."
        path="/stories"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Groups & Stories',
          description: 'Trips looking for people, travel groups, published itineraries and after stories on Tripician.',
          url: `${SITE_URL}/stories`,
        }}
      />

      <Box sx={{ maxWidth: CONTENT_MAX, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 3, md: 5 }, pb: { xs: 16, lg: 14 } }}>
        <PageHeader
          title="Groups & Stories"
          subtitle="Trips you can join, the groups that run them, and the stories of how they went."
          action={(
            <Button
              component={RouterLink}
              to="/groups?new=1"
              variant="outlined"
              startIcon={<IconUsersGroup size={17} />}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Start a group
            </Button>
          )}
        />

        <YourGroupsStrip />

        {/* One pill that does not shrink; below its width it scrolls instead of clipping the last option. */}
        <Box sx={{ mt: { xs: 2.5, md: 3 }, overflowX: 'auto', mx: { xs: -2, sm: 0 }, px: { xs: 2, sm: 0 }, '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}>
          <SegmentedControl value={kind} options={KIND_OPTIONS} onChange={setKind} aria-label="What to show" />
        </Box>

        {showRails && (
          <>
            {joinable.length > 0 && (
              <RailSection
                title="Looking for people"
                subtitle="Trips with room that are open to join requests. You settle costs with the group directly."
                onSeeAll={() => setKind('join')}
              >
                {joinable.slice(0, RAIL_ITEMS).map((t) => (
                  <Box key={t.id || t.Id} sx={{ flex: '0 0 auto', width: 300 }}>
                    <CommunityTripCard trip={t} onClick={() => openTrip(t)} />
                  </Box>
                ))}
              </RailSection>
            )}

            {organizations.length > 0 && (
              <RailSection
                title="Groups"
                subtitle="Clubs, communities and travel businesses planning trips on Tripician."
                onSeeAll={() => setKind('groups')}
              >
                {organizations.slice(0, RAIL_ITEMS).map((g) => (
                  <OrganizationCard key={g.id} organization={g} openTrips={openByGroup.get(g.id) ?? 0} width={280} />
                ))}
              </RailSection>
            )}

            {editorsPicks.length > 0 && (
              <StoryStrip stories={editorsPicks.slice(0, RAIL_ITEMS)} title="Editor's choice" subtitle="After stories picked by the Tripician team." />
            )}
          </>
        )}

        {showGroups ? (
          <Box sx={{ mt: { xs: 3, md: 3.5 } }}>
            {groupsLoading ? (
              <CardGridSkeleton count={6} minWidth={260} />
            ) : organizations.length === 0 ? (
              <EmptyState
                icon={IconBuildingCommunity}
                title="No groups yet"
                description="Start one for your friends, your club or your community, and it shows up here."
                actionLabel="Start a group"
                onAction={() => navigate('/groups?new=1')}
                secondaryLabel="Run trips as a business"
                onSecondary={() => navigate('/for-operators')}
              />
            ) : (
              <>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  {organizations.length} {organizations.length === 1 ? 'group' : 'groups'}
                </Typography>
                <Box sx={gridSx}>
                  {organizations.map((g) => (
                    <OrganizationCard key={g.id} organization={g} openTrips={openByGroup.get(g.id) ?? 0} />
                  ))}
                </Box>
              </>
            )}
          </Box>
        ) : (
          <>
            <Box sx={{ mt: showRails ? { xs: 5, md: 6 } : { xs: 3, md: 3.5 } }}>
              <VibeStrip present={presentVibes} value={filters.vibe} onChange={(vibe) => setFilters({ vibe })} />
            </Box>

            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
              {filters.q.trim() && <QueryChip q={filters.q.trim()} onRemove={() => setFilters({ q: '' })} />}
              {filters.place && (
                <DestinationChip name={filters.place} removable onClick={() => setFilters({ place: null })} />
              )}
              {showPlanFilters && (
                <>
                  <FilterMenuChip label="Length" value={filters.length} options={LENGTH_OPTIONS} onChange={(length) => setFilters({ length })} anyLabel="Any length" />
                  {kind !== 'join' && (
                    <FilterChip label="Looking for people" Icon={IconUsersPlus} active={filters.open} onClick={() => setFilters({ open: !filters.open })} />
                  )}
                  <FilterChip label="Verified" Icon={IconRosetteDiscountCheck} active={filters.verified} onClick={() => setFilters({ verified: !filters.verified })} />
                </>
              )}
              <Box sx={{ flex: 1 }} />
              {filtering && (
                <Button onClick={clearAll} size="small" sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 600 }}>
                  Clear all
                </Button>
              )}
              {items.length > 1 && (
                <Button
                  onClick={surprise}
                  startIcon={<IconDice5 size={17} />}
                  sx={(t) => ({
                    border: `1px solid ${t.custom.surface.border}`,
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    borderRadius: '50px',
                    height: 34,
                    px: 1.75,
                    textTransform: 'none',
                    fontWeight: 600,
                    '& .MuiButton-startIcon svg': { transition: `transform ${t.custom.motion.duration.base} ${t.custom.motion.easing.standard}` },
                    '&:hover': { borderColor: 'text.primary', bgcolor: 'background.paper' },
                    '&:hover .MuiButton-startIcon svg': { transform: 'rotate(-24deg)' },
                  })}
                >
                  Surprise me
                </Button>
              )}
            </Box>

            <Box sx={{ mt: 2.5 }}>
              {loading && items.length === 0 ? (
                <CardGridSkeleton count={8} minWidth={260} />
              ) : error ? (
                <ErrorState title="Couldn't load this" description={error} onRetry={reload} />
              ) : items.length === 0 ? (
                <EmptyState
                  icon={kind === 'join' ? IconUsersPlus : IconCompass}
                  title={emptyCopy.title}
                  description={emptyCopy.description}
                  {...(filtering
                    ? { actionLabel: 'Clear all', onAction: clearAll }
                    : { actionLabel: 'Create plan', onAction: () => openCreateTrip() })}
                />
              ) : (
                <>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    {countLine}
                    {/* Said out loud, so stories vanishing under a plan-only filter never looks like a bug. */}
                    {kind === 'all' && plansOnly(filters) && ' (stories are hidden while length, spots or verified is on)'}
                  </Typography>

                  {kind === 'join' ? (
                    // Joining is a decision about price, seats and dates, so this tab uses the listing card that shows them.
                    <Box sx={gridSx}>
                      {visible.map((item) => (
                        <CommunityTripCard key={item.key} trip={item.data} onClick={() => openTrip(item.data)} />
                      ))}
                    </Box>
                  ) : (
                    <Box sx={wallGridSx}>
                      {visible.map((item) => (
                        item.kind === 'trip'
                          ? <WallTripCard key={item.key} trip={item.data} onClick={() => openTrip(item.data)} />
                          : <StoryCard key={item.key} story={item.data} />
                      ))}
                    </Box>
                  )}

                  {shown < items.length && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                      <Button
                        onClick={() => setShown((n) => n + PAGE_SIZE)}
                        sx={(t) => ({
                          border: `1px solid ${t.custom.surface.border}`,
                          bgcolor: 'background.paper',
                          color: 'text.primary',
                          borderRadius: '50px',
                          px: 3, py: 1.1,
                          fontSize: 14, fontWeight: 700,
                          textTransform: 'none',
                          '&:hover': { borderColor: 'text.primary', bgcolor: 'background.paper' },
                        })}
                      >
                        Show more
                      </Button>
                    </Box>
                  )}
                </>
              )}
            </Box>
          </>
        )}

      </Box>
    </Box>
  );
};

export default BrowsePage;
