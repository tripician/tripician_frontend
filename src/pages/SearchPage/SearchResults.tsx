import React from 'react';
import { Box, Button, Tab, Tabs, Typography, useTheme } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { IconArrowRight, IconCheck, IconRosetteDiscountCheckFilled, IconSearch, IconUserPlus } from '@tabler/icons-react';
import type { AfterStorySummaryDto } from '../../afterstory/types';
import StoryCard from '../../afterstory/cards/StoryCard';
import { resolveStoryCover } from '../../afterstory/storyFormat';
import { storyPath } from '../../afterstory/storySlug';
import EmptyState from '../../components/ui/EmptyState';
import { CardGridSkeleton, ListSkeleton } from '../../components/ui/Skeletons';
import OrganizationCard from '../../organization/OrganizationCard';
import type { OrganizationDirectoryEntry } from '../../organization/types';
import type { PostTagCount } from '../../posts/types';
import { tripNights } from '../../utils/tripMeta';
import { tripCoverPhoto } from '../../utils/tripCover';
import { isJoinable } from '../../utils/tripRanking';
import { tripPath } from '../../utils/tripSlug';
import WallTripCard from '../CommunityPage/WallTripCard';
import { gridSx, wallGridSx } from '../CommunityPage/communityConstants';
import ResultRow, { GroupVisual, PersonVisual, PlaceVisual, TagVisual, ThumbVisual } from './ResultRow';
import type { PlaceEntry } from './placeIndex';
import type { RecentSearch } from './recentSearches';
import { SEARCH_TABS, searchHref, type SearchTab } from './searchParams';
import { TOP_CAPS, topOrder, type PersonResult, type TopSection } from './topResults';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function placeSummary(p: PlaceEntry): string {
  return [
    p.plans > 0 ? plural(p.plans, 'plan', 'plans') : null,
    p.stories > 0 ? plural(p.stories, 'story', 'stories') : null,
    p.open > 0 ? `${p.open} looking for people` : null,
  ].filter(Boolean).join(' · ');
}

function planSummary(trip: any): string {
  const countries: string[] = Array.isArray(trip?.countries) ? trip.countries : [];
  const nights = tripNights(trip);
  return [
    countries.slice(0, 2).join(', ') || null,
    nights ? plural(nights, 'night', 'nights') : null,
    isJoinable(trip) ? 'Looking for people' : null,
    trip?.organizationName ? `by ${trip.organizationName}` : null,
  ].filter(Boolean).join(' · ');
}

export interface SearchResultsProps {
  q: string;
  tab: SearchTab;
  onTab: (tab: SearchTab) => void;
  people: PersonResult[];
  peopleLoading: boolean;
  places: PlaceEntry[];
  plans: any[];
  plansLoading: boolean;
  stories: AfterStorySummaryDto[];
  storiesComplete: boolean;
  groups: OrganizationDirectoryEntry[];
  openByGroup: Map<string, number>;
  tags: PostTagCount[];
  viewerId?: number;
  following: Set<number> | null;
  busyId: number | null;
  onFollow: (userId: number) => void;
  onSaveRecent: (entry: RecentSearch) => void;
}

const SectionTitle: React.FC<{ title: string; more?: () => void }> = ({ title, more }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.25, mt: 2.5, mb: 0.5 }}>
    <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>{title}</Typography>
    {more && (
      <Button size="small" onClick={more} endIcon={<IconArrowRight size={15} />} sx={{ textTransform: 'none', fontWeight: 600, color: 'text.secondary' }}>
        See all
      </Button>
    )}
  </Box>
);

// Everything a query found, as Instagram lays it out: tabs across the top, Top mixing the best of each.
const SearchResults: React.FC<SearchResultsProps> = (props) => {
  const theme = useTheme();
  const {
    q, tab, onTab, people, peopleLoading, places, plans, plansLoading, stories, storiesComplete,
    groups, openByGroup, tags, viewerId, following, busyId, onFollow, onSaveRecent,
  } = props;

  const followButton = (p: PersonResult) => {
    if (viewerId != null && p.userId === viewerId) return null;
    const on = following?.has(p.userId) ?? false;
    return (
      <Button
        size="small"
        variant={on ? 'outlined' : 'contained'}
        disabled={busyId === p.userId}
        onClick={() => onFollow(p.userId)}
        startIcon={on ? <IconCheck size={15} /> : <IconUserPlus size={15} />}
        aria-label={on ? `Unfollow ${p.name}` : `Follow ${p.name}`}
        sx={{ textTransform: 'none', fontWeight: 700, minWidth: 0, px: 1.5 }}
      >
        {on ? 'Following' : 'Follow'}
      </Button>
    );
  };

  const personRow = (p: PersonResult) => (
    <ResultRow
      key={`person-${p.userId}`}
      to={`/traveler/${p.userId}`}
      visual={<PersonVisual name={p.name} src={p.avatar} />}
      title={p.name}
      subtitle={[
        p.tripCount > 0 ? plural(p.tripCount, 'published plan', 'published plans') : null,
        p.destinations.slice(0, 3).join(', ') || null,
      ].filter(Boolean).join(' · ') || null}
      trailing={followButton(p)}
      onOpen={() => onSaveRecent({ kind: 'person', label: p.name, href: `/traveler/${p.userId}`, image: p.avatar })}
    />
  );

  const placeRow = (p: PlaceEntry) => (
    <ResultRow
      key={`place-${p.code}`}
      to={searchHref({ place: p.name })}
      visual={<PlaceVisual name={p.name} />}
      title={p.name}
      subtitle={placeSummary(p)}
      onOpen={() => onSaveRecent({ kind: 'place', label: p.name, href: searchHref({ place: p.name }), sub: placeSummary(p) })}
    />
  );

  const groupRow = (g: OrganizationDirectoryEntry) => {
    const open = openByGroup.get(g.id) ?? 0;
    const sub = [plural(g.publishedTripCount, 'published trip', 'published trips'), open > 0 ? `${open} open to join` : null].filter(Boolean).join(' · ');
    return (
      <ResultRow
        key={`group-${g.id}`}
        to={`/o/${encodeURIComponent(g.slug)}`}
        visual={<GroupVisual name={g.name} src={g.logoUrl} />}
        title={g.name}
        subtitle={sub}
        trailing={g.verified ? (
          <Box component="span" aria-label="Verified business" sx={{ display: 'inline-flex', color: 'primary.main' }}>
            <IconRosetteDiscountCheckFilled size={18} />
          </Box>
        ) : undefined}
        onOpen={() => onSaveRecent({ kind: 'group', label: g.name, href: `/o/${encodeURIComponent(g.slug)}`, image: g.logoUrl })}
      />
    );
  };

  const tagHref = (t: PostTagCount) => `/posts?kind=questions&tags=${encodeURIComponent(t.id)}`;
  const tagRow = (t: PostTagCount) => (
    <ResultRow
      key={`tag-${t.id}`}
      to={tagHref(t)}
      visual={<TagVisual />}
      title={t.label}
      subtitle={plural(t.count, 'question', 'questions')}
      onOpen={() => onSaveRecent({ kind: 'tag', label: t.label, href: tagHref(t) })}
    />
  );

  const planRow = (trip: any) => {
    const id = trip?.id || trip?.Id;
    const href = tripPath({ id, name: trip?.name });
    const cover = tripCoverPhoto(trip);
    return (
      <ResultRow
        key={`plan-${id}`}
        to={href}
        state={{ trip }}
        visual={<ThumbVisual src={cover} />}
        title={trip?.name || 'Untitled trip'}
        subtitle={planSummary(trip) || 'Plan'}
        onOpen={() => onSaveRecent({ kind: 'plan', label: trip?.name || 'Untitled trip', href, image: cover })}
      />
    );
  };

  const storyRow = (s: AfterStorySummaryDto) => {
    const href = storyPath(s);
    const cover = resolveStoryCover(s);
    return (
      <ResultRow
        key={`story-${s.id}`}
        to={href}
        visual={<ThumbVisual src={cover} />}
        title={s.title}
        subtitle={['After story', s.destination, s.author?.displayName].filter(Boolean).join(' · ')}
        onOpen={() => onSaveRecent({ kind: 'story', label: s.title, href, image: cover })}
      />
    );
  };

  const nothing = (what: string) => (
    <EmptyState dense icon={IconSearch} title={`No ${what} match "${q}"`} description="Try a place, a name, or fewer words." />
  );

  const sectionRows: Record<TopSection, { title: string; rows: React.ReactNode[] }> = {
    people: { title: 'People', rows: people.slice(0, TOP_CAPS.people).map(personRow) },
    places: { title: 'Places', rows: places.slice(0, TOP_CAPS.places).map(placeRow) },
    plans: { title: 'Plans', rows: plans.slice(0, TOP_CAPS.plans).map(planRow) },
    groups: { title: 'Groups', rows: groups.slice(0, TOP_CAPS.groups).map(groupRow) },
    stories: { title: 'Stories', rows: stories.slice(0, TOP_CAPS.stories).map(storyRow) },
    tags: { title: 'Tags', rows: tags.slice(0, TOP_CAPS.tags).map(tagRow) },
  };
  const totals: Record<TopSection, number> = {
    people: people.length, places: places.length, plans: plans.length, groups: groups.length, stories: stories.length, tags: tags.length,
  };

  const order = topOrder({ q, people, places, plans, groups, stories, tags });
  const stillLoading = peopleLoading || plansLoading || !storiesComplete;

  const handoff = (kind: 'plans' | 'stories') => (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
      <Button
        component={RouterLink}
        to={`/stories?kind=${kind}&q=${encodeURIComponent(q)}`}
        endIcon={<IconArrowRight size={16} />}
        size="small"
        sx={{ textTransform: 'none', fontWeight: 600, color: 'text.secondary' }}
      >
        Filter these in Groups &amp; Stories
      </Button>
    </Box>
  );

  let body: React.ReactNode;
  switch (tab) {
    case 'people':
      body = peopleLoading && people.length === 0 ? <ListSkeleton rows={5} /> : people.length ? people.map(personRow) : nothing('people');
      break;
    case 'places':
      body = places.length ? places.map(placeRow) : nothing('places');
      break;
    case 'plans':
      body = plansLoading && plans.length === 0 ? <CardGridSkeleton count={6} minWidth={260} /> : plans.length ? (
        <>
          <Box sx={wallGridSx}>{plans.slice(0, 48).map((t) => <WallTripCardLink key={t.id || t.Id} trip={t} onSaveRecent={onSaveRecent} />)}</Box>
          {handoff('plans')}
        </>
      ) : nothing('plans');
      break;
    case 'stories':
      body = !storiesComplete && stories.length === 0 ? <CardGridSkeleton count={6} minWidth={260} /> : stories.length ? (
        <>
          <Box sx={wallGridSx}>{stories.slice(0, 48).map((s) => <StoryCard key={s.id} story={s} />)}</Box>
          {handoff('stories')}
        </>
      ) : nothing('stories');
      break;
    case 'groups':
      body = groups.length ? (
        <Box sx={gridSx}>{groups.map((g) => <OrganizationCard key={g.id} organization={g} openTrips={openByGroup.get(g.id) ?? 0} />)}</Box>
      ) : nothing('groups');
      break;
    case 'tags':
      body = tags.length ? tags.map(tagRow) : nothing('tags');
      break;
    default:
      body = order.length === 0
        ? (stillLoading ? <ListSkeleton rows={6} /> : nothing('results'))
        : order.map((section) => (
          <Box key={section}>
            <SectionTitle
              title={sectionRows[section].title}
              more={totals[section] > TOP_CAPS[section] ? () => onTab(section) : undefined}
            />
            {sectionRows[section].rows}
          </Box>
        ));
  }

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_, v: SearchTab) => onTab(v)}
        variant="scrollable"
        scrollButtons={false}
        aria-label="Search results"
        sx={{ borderBottom: `1px solid ${theme.custom.surface.border}`, minHeight: 44, '& .MuiTab-root': { minHeight: 44, textTransform: 'none', fontWeight: 600 } }}
      >
        {SEARCH_TABS.map((t) => <Tab key={t.value} value={t.value} label={t.label} />)}
      </Tabs>
      <Box sx={{ pt: tab === 'top' ? 0 : 2 }}>{body}</Box>
    </Box>
  );
};

// A plan card that also remembers itself as a recent search when opened.
const WallTripCardLink: React.FC<{ trip: any; onSaveRecent: (entry: RecentSearch) => void }> = ({ trip, onSaveRecent }) => {
  const navigate = useNavigate();
  const id = trip?.id || trip?.Id;
  const href = tripPath({ id, name: trip?.name });
  return (
    <WallTripCard
      trip={trip}
      onClick={() => {
        onSaveRecent({ kind: 'plan', label: trip?.name || 'Untitled trip', href, image: tripCoverPhoto(trip) });
        navigate(href, { state: { trip } });
      }}
    />
  );
};

export default SearchResults;
