import React from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { IconMap2, IconUsersPlus } from '@tabler/icons-react';
import Seo, { SITE_URL } from '../../components/Seo';
import PageHeader from '../../components/ui/PageHeader';
import FilterChip from '../../components/ui/FilterChip';
import SearchField from '../../components/ui/SearchField';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { CardGridSkeleton } from '../../components/ui/Skeletons';
import ChipRail from '../../components/ui/ChipRail';
import CommunityTripCard from '../CommunityPage/CommunityTripCard';
import { CATEGORIES, CONTENT_MAX, gridSx } from '../CommunityPage/communityConstants';
import { usePublishedTrips, isRecruiting } from '../CommunityPage/usePublishedTrips';
import { compareTripsForFeed } from '../../utils/tripRanking';
import { tripPath } from '../../utils/tripSlug';
import { staggerContainer, staggerItem } from '../../utils/animations';

interface TripsPageProps {
  /** /trips/looking-for-people keeps only trips open to join requests. */
  recruitingOnly?: boolean;
}

const PAGE_SIZE = 24;

const TripsPage: React.FC<TripsPageProps> = ({ recruitingOnly = false }) => {
  const navigate = useNavigate();
  const { trips, loading, error, reload } = usePublishedTrips();

  const [category, setCategory] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [shown, setShown] = React.useState(PAGE_SIZE);

  React.useEffect(() => { setShown(PAGE_SIZE); }, [category, search, recruitingOnly]);

  const filtered = React.useMemo(() => {
    let list = recruitingOnly ? trips.filter(isRecruiting) : trips;

    if (category !== 'all') {
      list = list.filter((t) => (t.vibe || '').toLowerCase() === category);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          (t.name || '').toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q) ||
          (Array.isArray(t.countries) && t.countries.some((c: string) => c.toLowerCase().includes(q))),
      );
    }

    return [...list].sort(compareTripsForFeed);
  }, [trips, category, search, recruitingOnly]);

  const visible = filtered.slice(0, shown);
  const handleClick = (trip: any) => {
    const id = trip.id || trip.Id;
    if (id) navigate(tripPath({ id, name: trip.name }), { state: { trip } });
  };

  const copy = recruitingOnly
    ? {
      path: '/trips/looking-for-people',
      seoTitle: 'Trips Looking For People, Join A Trip Someone Is Already Planning',
      seoDescription: 'Trips that are open to join requests. The organiser approves every person one at a time, and money never routes through Tripician.',
      title: 'Trips looking for people',
      subtitle: 'Somebody has already done the planning and has room. Ask to join, and they decide.',
      emptyTitle: 'Nobody is recruiting right now',
      emptyBody: 'When an organiser opens a trip to join requests, it shows up here.',
      icon: IconUsersPlus,
      noun: 'trip',
    }
    : {
      path: '/trips',
      seoTitle: 'All Trips, Real Itineraries From The Tripician Community',
      seoDescription: 'Every published trip on Tripician. Browse real itineraries by vibe and destination, then copy one into your own planner.',
      title: 'Every published trip',
      subtitle: 'Real itineraries people actually travelled. Copy any of them into your own planner.',
      emptyTitle: 'No trips yet',
      emptyBody: 'When travellers publish their plans, they show up here.',
      icon: IconMap2,
      noun: 'trip',
    };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Seo
        title={copy.seoTitle}
        description={copy.seoDescription}
        path={copy.path}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: copy.title,
          description: copy.seoDescription,
          url: `${SITE_URL}${copy.path}`,
        }}
      />

      <Box sx={{ maxWidth: CONTENT_MAX, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 3, md: 5 }, pb: 10 }}>
        <motion.div initial="hidden" animate="visible" variants={staggerContainer(0.08, 0.05)}>
          <motion.div variants={staggerItem}>
            <PageHeader title={copy.title} subtitle={copy.subtitle} />
          </motion.div>

          <motion.div variants={staggerItem}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, mt: { xs: 2.5, md: 3.5 } }}>
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

          <Box sx={{ mt: 4 }}>
            {loading ? (
              <CardGridSkeleton count={6} minWidth={300} />
            ) : error ? (
              <ErrorState title="Couldn't load trips" description={error} onRetry={reload} />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={copy.icon}
                title={category === 'all' && !search.trim() ? copy.emptyTitle : 'Nothing matches that'}
                description={category === 'all' && !search.trim() ? copy.emptyBody : 'Try another vibe, or clear the search.'}
                {...(category === 'all' && !search.trim()
                  ? { actionLabel: 'Browse the community', onAction: () => navigate('/community') }
                  : { actionLabel: 'Show everything', onAction: () => { setCategory('all'); setSearch(''); } })}
              />
            ) : (
              <>
                <Typography sx={{ mb: 2.5, fontSize: 13, color: 'text.secondary' }}>
                  {filtered.length} {filtered.length === 1 ? copy.noun : `${copy.noun}s`}
                </Typography>
                <Box sx={gridSx}>
                  {visible.map((t: any) => (
                    <CommunityTripCard key={t.id || t.Id} trip={t} onClick={() => handleClick(t)} />
                  ))}
                </Box>
                {shown < filtered.length && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <Box
                      component="button"
                      type="button"
                      onClick={() => setShown((n) => n + PAGE_SIZE)}
                      sx={(t) => ({
                        border: `1px solid ${t.custom.surface.border}`,
                        bgcolor: 'background.paper',
                        color: 'text.primary',
                        borderRadius: '50px',
                        px: 3, py: 1.1,
                        fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                        cursor: 'pointer',
                        '&:hover': { borderColor: 'text.primary' },
                      })}
                    >
                      Show more
                    </Box>
                  </Box>
                )}
              </>
            )}
          </Box>
        </motion.div>
      </Box>
    </Box>
  );
};

export default TripsPage;
