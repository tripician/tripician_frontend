// /search: Instagram-style search. Recent searches and a photo grid before you type, tabbed results after.
import React from 'react';
import { Box, IconButton, useMediaQuery, useTheme } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { IconArrowLeft } from '@tabler/icons-react';
import Seo from '../../components/Seo';
import SearchField from '../../components/ui/SearchField';
import { useRequireAuth } from '../../auth/AuthGate';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useFollowState } from '../../hooks/useFollowState';
import { useOrganizationDirectory, openTripsByOrganization } from '../../organization/useOrganizationDirectory';
import { postsService } from '../../posts/postsService';
import type { PostTagCount } from '../../posts/types';
import type { RootState } from '../../store';
import { MIN_QUERY } from '../../utils/searchText';
import { createSharedResource } from '../../utils/sharedResource';
import { isJoinable } from '../../utils/tripRanking';
import { EMPTY_FILTERS, matchStory, matchTrip } from '../BrowsePage/browseFilters';
import { usePublishedStories } from '../CommunityPage/usePublishedStories';
import { usePublishedTrips } from '../CommunityPage/usePublishedTrips';
import ExploreGrid from './ExploreGrid';
import PlaceView from './PlaceView';
import RecentSearchList from './RecentSearchList';
import SearchResults from './SearchResults';
import { buildExploreFeed } from './exploreFeed';
import { buildPlaceIndex, matchPlaces } from './placeIndex';
import { addRecent, clearRecents, readRecents, removeRecent, type RecentSearch } from './recentSearches';
import { searchHref, searchStateFromParams, searchStateToParams, type SearchState, type SearchTab } from './searchParams';
import { matchGroups, matchTags, rankPeople, rankPlans, rankStories } from './topResults';
import { usePeopleSearch } from './usePeopleSearch';
import { useExplorePosts } from './useExplorePosts';

const CONTENT_MAX = 935;
const TILE_PAGE = 30;
const DEBOUNCE_MS = 300;

const postTags = createSharedResource<PostTagCount[]>([], () => postsService.tags(), { ttlMs: 5 * 60_000 });

function usePostTags(): PostTagCount[] {
  const snap = React.useSyncExternalStore(postTags.subscribe, postTags.getSnapshot);
  React.useEffect(() => { void postTags.ensure(); }, []);
  return snap.data;
}

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = React.useMemo(() => searchStateFromParams(searchParams), [searchParams]);

  const requireAuth = useRequireAuth();
  const { token } = useAuthToken();
  const viewerId = useSelector((s: RootState) => {
    const id = Number(s.user.profile?.id);
    return Number.isFinite(id) && id > 0 ? id : undefined;
  });

  const theme = useTheme();
  // A phone gets one word, as Instagram does; the long prompt was cut off beside the back arrow.
  const compact = useMediaQuery(theme.breakpoints.down('sm'));
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [input, setInput] = React.useState(state.q);
  const applied = useDebouncedValue(input.trim(), DEBOUNCE_MS);
  // The last q this page wrote, so its own URL update never overwrites what is still being typed.
  const lastWritten = React.useRef(state.q);

  const update = React.useCallback((patch: Partial<SearchState>, push = false) => {
    setSearchParams((prev) => searchStateToParams({ ...searchStateFromParams(prev), ...patch }), { replace: !push });
  }, [setSearchParams]);

  React.useEffect(() => {
    if (state.q === lastWritten.current) return;
    lastWritten.current = state.q;
    setInput(state.q);
  }, [state.q]);

  React.useEffect(() => {
    if (applied === state.q.trim()) return;
    lastWritten.current = applied;
    update({ q: applied });
  }, [applied, state.q, update]);

  const [autoFocus] = React.useState(() => {
    try {
      return typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;
    } catch {
      return false;
    }
  });

  const { trips, loading: tripsLoading } = usePublishedTrips();
  const { stories, loading: storiesLoading, complete: storiesComplete } = usePublishedStories();
  const { organizations } = useOrganizationDirectory();
  const tags = usePostTags();

  const searching = applied.length >= MIN_QUERY && !state.place;
  const wantsPeople = searching && (state.tab === 'top' || state.tab === 'people');
  const { people: rawPeople, loading: peopleLoading } = usePeopleSearch(applied, wantsPeople);
  const { following, busyId, toggle } = useFollowState(viewerId, token, wantsPeople && rawPeople.length > 0);

  const [recents, setRecents] = React.useState<RecentSearch[]>(() => readRecents());
  const saveRecent = React.useCallback((entry: RecentSearch) => setRecents(addRecent(entry)), []);

  const placeIndex = React.useMemo(() => buildPlaceIndex(trips, stories, (t) => isJoinable(t)), [trips, stories]);
  const openByGroup = React.useMemo(() => openTripsByOrganization(trips, (t) => isJoinable(t)), [trips]);

  const results = React.useMemo(() => {
    if (!searching) return null;
    const planFilter = { ...EMPTY_FILTERS, kind: 'plans' as const, q: applied };
    const storyFilter = { ...EMPTY_FILTERS, kind: 'stories' as const, q: applied };
    return {
      places: matchPlaces(placeIndex, applied),
      plans: rankPlans(trips.filter((t) => matchTrip(t, planFilter)), applied),
      stories: rankStories(stories.filter((s) => matchStory(s, storyFilter)), applied),
      groups: matchGroups(organizations, applied),
      tags: matchTags(tags, applied),
    };
  }, [searching, applied, placeIndex, trips, stories, organizations, tags]);
  const people = React.useMemo(() => rankPeople(rawPeople, applied), [rawPeople, applied]);

  const explorePosts = useExplorePosts(!searching && !state.place);
  const tiles = React.useMemo(
    () => buildExploreFeed({ trips, stories, posts: explorePosts.posts, postsExhausted: explorePosts.exhausted }),
    [trips, stories, explorePosts.posts, explorePosts.exhausted],
  );
  const [shown, setShown] = React.useState(TILE_PAGE);
  const exploreHasMore = shown < tiles.length || !explorePosts.exhausted;
  const showMore = () => {
    if (shown + TILE_PAGE > tiles.length && !explorePosts.exhausted) explorePosts.loadMore();
    setShown((n) => n + TILE_PAGE);
  };

  const follow = (userId: number) => {
    if (!requireAuth({ reason: 'Follow a traveller to see their trips and stories as they publish.' })) return;
    void toggle(userId);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const q = input.trim();
      if (q.length >= MIN_QUERY) saveRecent({ kind: 'query', label: q, href: searchHref({ q }) });
      if (q !== state.q) {
        lastWritten.current = q;
        update({ q });
      }
      // Drops the phone keyboard so the results are visible.
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setInput('');
    }
  };

  // A scroll on a touch screen means the reader is looking at results, not typing.
  const dropKeyboard = () => {
    if (document.activeElement === inputRef.current) inputRef.current?.blur();
  };

  const openRecent = (entry: RecentSearch) => {
    saveRecent(entry);
    if (entry.kind === 'query') setInput(entry.label);
  };

  return (
    <Box sx={{ minHeight: '100%', bgcolor: 'background.default' }}>
      <Seo
        title="Search"
        description="Search travellers, places, trip plans, after stories and travel groups on Tripician."
        path="/search"
        noindex
      />

      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          bgcolor: 'background.default',
          pt: { xs: 1.5, md: 3 },
          pb: 1.5,
        }}
      >
        <Box sx={{ maxWidth: CONTENT_MAX, mx: 'auto', px: { xs: 2, sm: 3 }, display: 'flex', alignItems: 'center', gap: 1 }}>
          {state.place && (
            <IconButton aria-label="Back to search" onClick={() => update({ place: null }, true)} sx={{ flexShrink: 0 }}>
              <IconArrowLeft size={20} />
            </IconButton>
          )}
          <SearchField
            value={input}
            onChange={(v) => {
              setInput(v);
              if (state.place) update({ place: null });
            }}
            onClear={() => { setInput(''); inputRef.current?.focus(); }}
            onKeyDown={onKeyDown}
            inputRef={inputRef}
            autoFocus={autoFocus && !state.place}
            enterKeyHint="search"
            size="large"
            placeholder={compact ? 'Search' : 'Search people, places, trips and groups'}
            aria-label="Search Tripician"
            sx={{ flex: 1 }}
          />
        </Box>
      </Box>

      <Box
        onTouchMove={dropKeyboard}
        sx={{ maxWidth: CONTENT_MAX, mx: 'auto', px: { xs: state.place || searching ? 2 : 0, sm: 3 }, pt: 1, pb: { xs: 4, md: 8 } }}
      >
        {state.place ? (
          <PlaceView
            place={state.place}
            trips={trips}
            stories={stories}
            groups={organizations}
            tags={tags}
            loading={tripsLoading || storiesLoading}
          />
        ) : searching && results ? (
          <SearchResults
            q={applied}
            tab={state.tab}
            onTab={(tab: SearchTab) => update({ tab })}
            people={people}
            peopleLoading={peopleLoading}
            places={results.places}
            plans={results.plans}
            plansLoading={tripsLoading}
            stories={results.stories}
            storiesComplete={storiesComplete}
            groups={results.groups}
            openByGroup={openByGroup}
            tags={results.tags}
            viewerId={viewerId}
            following={following}
            busyId={busyId}
            onFollow={follow}
            onSaveRecent={saveRecent}
          />
        ) : (
          <>
            <Box sx={{ px: { xs: 2, sm: 0 } }}>
              <RecentSearchList
                recents={recents}
                onOpen={openRecent}
                onRemove={(entry) => setRecents(removeRecent(entry))}
                onClear={() => setRecents(clearRecents())}
              />
            </Box>
            <ExploreGrid
              tiles={tiles}
              shown={shown}
              loading={tripsLoading || storiesLoading || !explorePosts.ready || explorePosts.loading}
              hasMore={exploreHasMore}
              onMore={showMore}
            />
          </>
        )}
      </Box>
    </Box>
  );
};

export default SearchPage;
