/**
 * /stories , the library: every published plan and every story about one.
 *
 * Community is the live feed and changes hour to hour. This is where somebody
 * goes to look through finished work, which is why it is a plain filtered grid
 * with a stable bottom of page rather than an editorial scroll.
 *
 * It carries both kinds because the navigation says "Plans & stories", and a
 * label that promises two things has to deliver two things.
 */

import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IconCompass } from '@tabler/icons-react';
import Seo, { SITE_URL } from '../../components/Seo';
import PageHeader from '../../components/ui/PageHeader';
import FilterChip from '../../components/ui/FilterChip';
import SearchField from '../../components/ui/SearchField';
import SegmentedControl from '../../components/ui/SegmentedControl';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { CardGridSkeleton } from '../../components/ui/Skeletons';
import ChipRail from '../../components/ui/ChipRail';
import CommunityTripCard from '../CommunityPage/CommunityTripCard';
import CrewDirectory from '../CrewPage/CrewDirectory';
import StoryCard from '../../afterstory/cards/StoryCard';
import { CATEGORIES, CONTENT_MAX, gridSx } from '../CommunityPage/communityConstants';
import { usePublishedTrips } from '../CommunityPage/usePublishedTrips';
import { afterStoryService } from '../../afterstory/afterStoryService';
import type { AfterStorySummaryDto } from '../../afterstory/types';
import { compareTripsForFeed } from '../../utils/tripRanking';
import { tripPath } from '../../utils/tripSlug';
import { FEATURE_FLAGS } from '../../config/featureFlags';
import { staggerContainer, staggerItem } from '../../utils/animations';

/*
 * Travellers is a mode, not a fourth kind of content: it swaps the whole surface
 * for the people directory rather than adding rows to the grid. That is why
 * "All" still means every plan and every story, and why the directory brings its
 * own search and filters instead of borrowing this page's.
 */
type Kind = 'all' | 'plans' | 'stories' | 'travellers';

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'plans', label: 'Plans' },
  { value: 'stories', label: 'Stories' },
  { value: 'travellers', label: 'Travellers' },
];

const PAGE_SIZE = 24;

const BrowsePage: React.FC = () => {
  const navigate = useNavigate();
  const { trips, loading: tripsLoading, error, reload } = usePublishedTrips();

  const [searchParams, setSearchParams] = useSearchParams();
  const requestedKind = searchParams.get('kind');
  const kind: Kind = requestedKind === 'plans' || requestedKind === 'stories' || requestedKind === 'travellers'
    ? requestedKind
    : 'all';
  const setKind = (next: Kind) => setSearchParams((prev) => {
    if (next === 'all') prev.delete('kind'); else prev.set('kind', next);
    return prev;
  }, { replace: true });

  const [stories, setStories] = React.useState<AfterStorySummaryDto[]>([]);
  const [storiesLoading, setStoriesLoading] = React.useState(true);
  const [category, setCategory] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [shown, setShown] = React.useState(PAGE_SIZE);

  React.useEffect(() => {
    if (!FEATURE_FLAGS.afterStory) { setStoriesLoading(false); return; }
    let active = true;
    afterStoryService.listPublished({ page: 1, pageSize: 60 })
      .then((r) => { if (active) setStories(Array.isArray(r?.items) ? r.items : []); })
      .catch(() => { if (active) setStories([]); })
      .finally(() => { if (active) setStoriesLoading(false); });
    return () => { active = false; };
  }, []);

  React.useEffect(() => { setShown(PAGE_SIZE); }, [kind, category, search]);

  const query = search.trim().toLowerCase();

  const filteredTrips = React.useMemo(() => {
    if (kind !== 'all' && kind !== 'plans') return [];
    let list = trips;
    if (category !== 'all') list = list.filter((t) => (t.vibe || '').toLowerCase() === category);
    if (query) {
      list = list.filter((t) =>
        (t.name || '').toLowerCase().includes(query) ||
        (t.description || '').toLowerCase().includes(query) ||
        (Array.isArray(t.countries) && t.countries.some((c: string) => c.toLowerCase().includes(query))));
    }
    return [...list].sort(compareTripsForFeed);
  }, [trips, kind, category, query]);

  const filteredStories = React.useMemo(() => {
    if (kind !== 'all' && kind !== 'stories') return [];
    let list = stories;
    if (category !== 'all') list = list.filter((s) => (s.vibe || '').toLowerCase() === category);
    if (query) {
      list = list.filter((s) =>
        (s.title || '').toLowerCase().includes(query) ||
        (s.summary || '').toLowerCase().includes(query) ||
        (s.destination || '').toLowerCase().includes(query) ||
        (Array.isArray(s.countries) && s.countries.some((c) => c.toLowerCase().includes(query))));
    }
    return list;
  }, [stories, kind, category, query]);

  /*
   * One grid, both kinds, spread rather than stacked. The interval is derived
   * from the two counts so a story lands in the first row whatever the ratio,
   * which is the same rule Community uses and for the same reason.
   */
  const items = React.useMemo(() => {
    const out: Array<
      | { kind: 'trip'; key: string; data: any }
      | { kind: 'story'; key: string; data: AfterStorySummaryDto }
    > = [];

    const step = filteredStories.length === 0
      ? Number.POSITIVE_INFINITY
      : Math.max(2, Math.floor(filteredTrips.length / (filteredStories.length + 1)));

    let s = 0;
    filteredTrips.forEach((t, i) => {
      out.push({ kind: 'trip', key: `trip-${t.id || t.Id || i}`, data: t });
      if ((i + 1) % step === 0 && s < filteredStories.length) {
        out.push({ kind: 'story', key: `story-${filteredStories[s].id}`, data: filteredStories[s] });
        s += 1;
      }
    });
    for (; s < filteredStories.length; s += 1) {
      out.push({ kind: 'story', key: `story-${filteredStories[s].id}`, data: filteredStories[s] });
    }
    return out;
  }, [filteredTrips, filteredStories]);

  const showTravellers = kind === 'travellers';
  const loading = tripsLoading || storiesLoading;
  const visible = items.slice(0, shown);
  const isFiltering = category !== 'all' || query.length > 0;

  const countLine = [
    filteredTrips.length > 0 ? `${filteredTrips.length} ${filteredTrips.length === 1 ? 'plan' : 'plans'}` : null,
    filteredStories.length > 0 ? `${filteredStories.length} ${filteredStories.length === 1 ? 'story' : 'stories'}` : null,
  ].filter(Boolean).join(' and ');

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Seo
        title="Plans And Stories From The Tripician Community"
        description="Every published itinerary and the after stories about them. Browse by vibe, copy any plan into your own trip, and read what it was actually like."
        path="/stories"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Plans and stories',
          description: 'Published travel itineraries and after stories on Tripician.',
          url: `${SITE_URL}/stories`,
        }}
      />

      <Box sx={{ maxWidth: CONTENT_MAX, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 3, md: 5 }, pb: 10 }}>
        <motion.div initial="hidden" animate="visible" variants={staggerContainer(0.08, 0.05)}>
          <motion.div variants={staggerItem}>
            <PageHeader
              title="Plans & stories"
              subtitle={showTravellers
                ? 'Travellers who publish real itineraries. Follow the ones who travel like you.'
                : 'Itineraries people published, and what the trips were actually like.'}
              action={(
                <SegmentedControl
                  value={kind}
                  options={KIND_OPTIONS}
                  onChange={(value) => setKind(value)}
                />
              )}
            />
          </motion.div>

          {!showTravellers && (
            <motion.div variants={staggerItem}>
              <Box
                sx={{
                  display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5,
                  mt: { xs: 2.5, md: 3.5 },
                }}
              >
                <ChipRail sx={{ flex: 1, minWidth: 0 }}>
                  {CATEGORIES.map((c) => (
                    <FilterChip
                      key={c.id}
                      label={c.label}
                      Icon={c.Icon}
                      active={category === c.id}
                      onClick={() => setCategory(c.id)}
                    />
                  ))}
                </ChipRail>
                <SearchField
                  value={search}
                  onChange={setSearch}
                  placeholder="Search destinations, trips, vibes..."
                  sx={{ width: { xs: '100%', md: 320 }, flexShrink: 0 }}
                />
              </Box>
            </motion.div>
          )}

          {showTravellers && (
            <Box sx={{ mt: { xs: 2.5, md: 3.5 } }}>
              <CrewDirectory />
            </Box>
          )}

          {!showTravellers && (
          <Box sx={{ mt: 4 }}>
            {loading ? (
              <CardGridSkeleton count={6} minWidth={300} />
            ) : error ? (
              <ErrorState title="Couldn't load this" description={error} onRetry={reload} />
            ) : items.length === 0 ? (
              <EmptyState
                icon={IconCompass}
                title={isFiltering ? 'Nothing matches that' : 'Nothing published yet'}
                description={isFiltering
                  ? 'Try another vibe, or clear the search.'
                  : 'When travellers publish their plans and write them up, they show up here.'}
                {...(isFiltering
                  ? { actionLabel: 'Show everything', onAction: () => { setCategory('all'); setSearch(''); } }
                  : { actionLabel: 'Plan a trip', onAction: () => navigate('/tripplanner') })}
              />
            ) : (
              <>
                <Typography sx={{ mb: 2.5, fontSize: 13, color: 'text.secondary' }}>
                  {countLine}
                </Typography>

                <Box sx={{ ...gridSx, alignItems: 'start' }}>
                  {visible.map((item) => (
                    <Box key={item.key}>
                      {item.kind === 'trip' ? (
                        <CommunityTripCard
                          trip={item.data}
                          onClick={() => {
                            const id = item.data.id || item.data.Id;
                            if (id) navigate(tripPath({ id, name: item.data.name }), { state: { trip: item.data } });
                          }}
                        />
                      ) : (
                        <StoryCard story={item.data} />
                      )}
                    </Box>
                  ))}
                </Box>

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
          )}
        </motion.div>
      </Box>
    </Box>
  );
};

export default BrowsePage;
