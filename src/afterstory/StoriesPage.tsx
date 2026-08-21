/**
 * /stories , the full list.
 *
 * Community shows a curated slice; this is where someone goes when they want to
 * browse. Paginated with a "load more" rather than infinite scroll, because an
 * indexable list needs a stable bottom of page and infinite scroll gives
 * crawlers nowhere to stop.
 */

import React from 'react';
import { Box, Button, CircularProgress, Typography, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import Seo, { SITE_URL } from '../components/Seo';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import FilterChip from '../components/ui/FilterChip';
import StoryCard from './cards/StoryCard';
import StoryCreationModal from './StoryCreationModal';
import { afterStoryService } from './afterStoryService';
import { VIBES } from '../pages/CommunityPage/vibes';
import { staggerContainer, staggerItem } from '../utils/animations';
import { useAuthToken } from '../hooks/useAuth0Token';
import type { AfterStorySummaryDto } from './types';
import { IconBook, IconPencilPlus } from '@tabler/icons-react';

const CONTENT_MAX = 1280;
const PAGE_SIZE = 12;

const StoriesPage: React.FC = () => {
  const theme = useTheme();
  const { token } = useAuthToken();

  const [stories, setStories] = React.useState<AfterStorySummaryDto[]>([]);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [vibe, setVibe] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);

  const load = React.useCallback(
    async (targetPage: number, replace: boolean) => {
      if (replace) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      try {
        const result = await afterStoryService.listPublished({
          page: targetPage,
          pageSize: PAGE_SIZE,
          vibe,
        });
        setStories((prev) => (replace ? result.items : [...prev, ...result.items]));
        setHasMore(result.hasMore);
        setTotal(result.total);
        setPage(result.page);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load stories.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [vibe],
  );

  React.useEffect(() => {
    void load(1, true);
  }, [load]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Seo
        title="After Stories, Real Trips Written Up By The People Who Took Them"
        description="Read what trips were actually like: what was worth it, what to skip, and what it cost. Written by travellers, not brochures."
        path="/stories"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'After Stories',
          description: 'Trips written up by the travellers who took them.',
          url: `${SITE_URL}/stories`,
        }}
      />

      <Box
        sx={{
          maxWidth: CONTENT_MAX,
          mx: 'auto',
          px: { xs: 2, sm: 3, md: 4 },
          pt: { xs: 3, md: 5 },
          pb: 10,
        }}
      >
        <motion.div initial="hidden" animate="visible" variants={staggerContainer(0.08, 0.05)}>
          <motion.div variants={staggerItem}>
            <PageHeader
              title="After Stories"
              subtitle="What the trip was actually like, from the people who went."
              action={
                token ? (
                  <Button
                    variant="contained"
                    startIcon={<IconPencilPlus size={16} />}
                    onClick={() => setCreating(true)}
                  >
                    Write a story
                  </Button>
                ) : undefined
              }
            />
          </motion.div>

          <motion.div variants={staggerItem}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 3, mb: 3.5 }}>
              <FilterChip label="All" active={vibe === null} onClick={() => setVibe(null)} />
              {Object.entries(VIBES).map(([key, item]) => (
                <FilterChip
                  key={key}
                  label={item.label}
                  Icon={item.Icon}
                  active={vibe === key}
                  onClick={() => setVibe(vibe === key ? null : key)}
                />
              ))}
            </Box>
          </motion.div>

          {loading ? (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
              <CircularProgress size={22} />
            </Box>
          ) : error ? (
            <ErrorState
              title="Could not load stories"
              description={error}
              onRetry={() => void load(1, true)}
            />
          ) : stories.length === 0 ? (
            <EmptyState
              icon={IconBook}
              title={vibe ? 'Nothing here yet for that vibe' : 'No stories yet'}
              description={
                vibe
                  ? 'Try another vibe, or be the first to write one.'
                  : 'Be the first to write up a trip. It takes about ten minutes if you use the plan you already made.'
              }
              {...(token ? { actionLabel: 'Write a story', onAction: () => setCreating(true) } : {})}
            />
          ) : (
            <>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                {total} {total === 1 ? 'story' : 'stories'}
                {vibe ? ` tagged ${VIBES[vibe]?.label ?? vibe}` : ''}
              </Typography>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'minmax(0, 1fr)',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    lg: 'repeat(3, minmax(0, 1fr))',
                  },
                  gap: 3,
                }}
              >
                {stories.map((story) => (
                  <StoryCard key={story.id} story={story} />
                ))}
              </Box>

              {hasMore && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
                  <Button
                    variant="outlined"
                    disabled={loadingMore}
                    onClick={() => void load(page + 1, false)}
                    sx={{ borderColor: theme.custom.surface.border }}
                  >
                    {loadingMore ? 'Loading...' : 'Load more'}
                  </Button>
                </Box>
              )}
            </>
          )}
        </motion.div>
      </Box>

      <StoryCreationModal open={creating} onClose={() => setCreating(false)} />
    </Box>
  );
};

export default StoriesPage;
