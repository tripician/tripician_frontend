import React from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { IconArrowRight, IconMapPin, IconMessageCircleQuestion } from '@tabler/icons-react';
import type { AfterStorySummaryDto } from '../../afterstory/types';
import StoryCard from '../../afterstory/cards/StoryCard';
import CountryFlag from '../../components/ui/CountryFlag';
import EmptyState from '../../components/ui/EmptyState';
import ScrollRail from '../../components/ui/ScrollRail';
import { CardGridSkeleton } from '../../components/ui/Skeletons';
import OrganizationCard from '../../organization/OrganizationCard';
import { openTripsByOrganization } from '../../organization/useOrganizationDirectory';
import type { OrganizationDirectoryEntry } from '../../organization/types';
import type { PostTagCount } from '../../posts/types';
import { countryCodeFromName, countryNameFromCode } from '../../utils/countryFlags';
import { curatedCover, defaultCover } from '../../utils/tripCover';
import { compareTripsForFeed, isJoinable } from '../../utils/tripRanking';
import { tripPath } from '../../utils/tripSlug';
import WallTripCard from '../CommunityPage/WallTripCard';
import { wallGridSx } from '../CommunityPage/communityConstants';
import { EMPTY_FILTERS, matchStory, matchTrip, mixFeed } from '../BrowsePage/browseFilters';

const PAGE = 24;

interface PlaceViewProps {
  place: string;
  trips: any[];
  stories: AfterStorySummaryDto[];
  groups: OrganizationDirectoryEntry[];
  tags: PostTagCount[];
  loading: boolean;
}

const Rail: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Box component="section" sx={{ mt: 4 }}>
    <Typography variant="h5" component="h2" sx={{ mb: 1.5 }}>{title}</Typography>
    <ScrollRail ariaLabel={title}>{children}</ScrollRail>
  </Box>
);

// A country as Instagram would show a location: its photo, what is published there, who you could go with.
const PlaceView: React.FC<PlaceViewProps> = ({ place, trips, stories, groups, tags, loading }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [shown, setShown] = React.useState(PAGE);
  const [coverFailed, setCoverFailed] = React.useState(false);

  const code = countryCodeFromName(place);
  const name = (code && countryNameFromCode(code)) || place;
  const cover = coverFailed ? null : curatedCover(name) ?? defaultCover();

  const filters = React.useMemo(() => ({ ...EMPTY_FILTERS, place: name }), [name]);
  const placeTrips = React.useMemo(() => trips.filter((t) => matchTrip(t, filters)).sort(compareTripsForFeed), [trips, filters]);
  const placeStories = React.useMemo(() => stories.filter((s) => matchStory(s, filters)), [stories, filters]);
  const joinable = React.useMemo(() => placeTrips.filter((t) => isJoinable(t)), [placeTrips]);
  const items = React.useMemo(() => mixFeed(placeTrips, placeStories), [placeTrips, placeStories]);

  const placeGroups = React.useMemo(() => {
    const ids = new Set(placeTrips.map((t) => t?.organizationId).filter((id): id is string => typeof id === 'string'));
    return groups.filter((g) => ids.has(g.id));
  }, [groups, placeTrips]);
  const openByGroup = React.useMemo(() => openTripsByOrganization(trips, (t) => isJoinable(t)), [trips]);

  const questionTag = React.useMemo(
    () => tags.find((t) => t.group === 'place' && t.count > 0 && countryCodeFromName(t.id.replace(/^place:/, '')) === code),
    [tags, code],
  );

  const counts = [
    placeTrips.length > 0 ? `${placeTrips.length} ${placeTrips.length === 1 ? 'plan' : 'plans'}` : null,
    placeStories.length > 0 ? `${placeStories.length} ${placeStories.length === 1 ? 'story' : 'stories'}` : null,
    joinable.length > 0 ? `${joinable.length} looking for people` : null,
  ].filter(Boolean).join(' · ');

  const openTrip = (trip: any) => {
    const id = trip?.id || trip?.Id;
    if (id) navigate(tripPath({ id, name: trip.name }), { state: { trip } });
  };

  return (
    <Box>
      <Box sx={{ position: 'relative', height: { xs: 140, md: 200 }, borderRadius: '16px', overflow: 'hidden', bgcolor: theme.custom.surface.brandTint }}>
        {cover && (
          <Box component="img" src={cover} alt="" onError={() => setCoverFailed(true)} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
        <CountryFlag country={name} size={40} variant="circle" />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h2" component="h1" noWrap>{name}</Typography>
          {!loading && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {counts || 'Nothing published here yet'}
            </Typography>
          )}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
        {questionTag && (
          <Button
            component={RouterLink}
            to={`/posts?kind=questions&tags=${encodeURIComponent(questionTag.id)}`}
            startIcon={<IconMessageCircleQuestion size={17} />}
            variant="outlined"
            size="small"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {questionTag.count} {questionTag.count === 1 ? 'question' : 'questions'} about {name}
          </Button>
        )}
        {items.length > 0 && (
          <Button
            component={RouterLink}
            to={`/stories?place=${encodeURIComponent(name)}`}
            endIcon={<IconArrowRight size={16} />}
            size="small"
            sx={{ textTransform: 'none', fontWeight: 600, color: 'text.secondary' }}
          >
            Filter these in Groups &amp; Stories
          </Button>
        )}
      </Box>

      {placeGroups.length > 0 && (
        <Rail title={`Groups going to ${name}`}>
          {placeGroups.map((g) => (
            <OrganizationCard key={g.id} organization={g} openTrips={openByGroup.get(g.id) ?? 0} width={280} />
          ))}
        </Rail>
      )}

      <Box component="section" sx={{ mt: 4 }}>
        {loading && items.length === 0 ? (
          <CardGridSkeleton count={6} minWidth={260} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={IconMapPin}
            title={`No plans or stories in ${name} yet`}
            description="When travellers publish a plan or write up a trip here, it shows up on this page."
          />
        ) : (
          <>
            <Typography variant="h5" component="h2" sx={{ mb: 1.5 }}>Plans and stories</Typography>
            <Box sx={wallGridSx}>
              {items.slice(0, shown).map((item) => (
                item.kind === 'trip'
                  ? <WallTripCard key={item.key} trip={item.data} onClick={() => openTrip(item.data)} />
                  : <StoryCard key={item.key} story={item.data} />
              ))}
            </Box>
            {shown < items.length && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Button onClick={() => setShown((n) => n + PAGE)} variant="outlined" sx={{ textTransform: 'none', fontWeight: 700 }}>
                  Show more
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default PlaceView;
