/**
 * A horizontal row of stories, for surfaces that already have a primary job.
 *
 * Same shape as the existing "Travel guides" strip on Community, so stories get
 * exposure on the trips tab without demanding a tab switch first. Renders
 * nothing at all when empty: a section header over a blank row is how a product
 * announces that a feature is dead.
 */

import React from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import StoryCard from './StoryCard';
import type { AfterStorySummaryDto } from '../types';

interface StoryStripProps {
  stories: AfterStorySummaryDto[];
  title?: string;
  subtitle?: string;
  /** Where "See all" goes. Omit to hide the action. */
  seeAllHref?: string;
  loading?: boolean;
}

const CARD_WIDTH = 280;
/**
 * Derived from StoryCard's 4:5, not chosen. The skeleton used to be a flat 300
 * against a card that rendered taller, so the rail grew and shoved the section
 * below it down the moment the fetch landed.
 */
const CARD_HEIGHT = Math.round(CARD_WIDTH * 1.25);

const StoryStrip: React.FC<StoryStripProps> = ({
  stories,
  title = 'After stories',
  subtitle,
  seeAllHref,
  loading,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();

  if (!loading && stories.length === 0) return null;

  return (
    <Box sx={{ mt: { xs: 4, md: 6 } }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, mb: 2.5 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" component="h2" sx={{ color: 'text.primary' }} noWrap>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box sx={{ flex: 1 }} />
        {seeAllHref && stories.length > 0 && (
          <Button size="small" onClick={() => navigate(seeAllHref)} sx={{ flexShrink: 0 }}>
            See all
          </Button>
        )}
      </Box>

      <Box
        sx={{
          display: 'flex',
          gap: 2.5,
          overflowX: 'auto',
          pb: 1,
          scrollSnapType: 'x proximity',
          '::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }}
      >
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Box
                key={i}
                sx={{
                  flex: '0 0 auto',
                  width: CARD_WIDTH,
                  height: CARD_HEIGHT,
                  borderRadius: '16px',
                  bgcolor: theme.custom.surface.hover,
                }}
              />
            ))
          : stories.map((story) => (
              <Box key={story.id} sx={{ scrollSnapAlign: 'start' }}>
                <StoryCard story={story} width={CARD_WIDTH} />
              </Box>
            ))}
      </Box>
    </Box>
  );
};

export default StoryStrip;
