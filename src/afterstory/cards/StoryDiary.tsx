/**
 * Stories on a profile, read as a diary rather than browsed as a rail.
 *
 * StoryStrip is the right shape on Community, where stories compete with trips
 * for a glance. A profile is the opposite situation: someone is already here
 * because they want to know who this person is, and a row of 280px cards makes
 * that person look like a catalogue. So the same summaries get the editorial
 * treatment the story reader itself uses, one per row, dated in the margin.
 *
 * The type comes from the story's own template rather than from anything chosen
 * here, so an entry written as a photo essay keeps a photo essay's measure and a
 * journal keeps a journal's drop cap. That is the whole reason the profile and
 * the reader do not drift apart.
 */

import React from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { IconArrowRight } from '@tabler/icons-react';
import { storyPath } from '../storySlug';
import { templateStyle } from '../render/templates';
import type { AfterStorySummaryDto } from '../types';

interface StoryDiaryProps {
  stories: AfterStorySummaryDto[];
  /** Shown above the first entry. Omit on surfaces that already say it. */
  title?: string;
  subtitle?: string;
  /** How many to render before the "read more" fold. */
  initial?: number;
}

/** The date in the margin: "May 2026", or nothing if the story never said. */
function entryDate(story: AfterStorySummaryDto): string | null {
  const raw = story.travelStartDate || story.publishedAt;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

const DiaryEntry: React.FC<{ story: AfterStorySummaryDto; first: boolean }> = ({ story, first }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const style = templateStyle(story.template);

  const open = () => navigate(storyPath(story));
  const date = entryDate(story);
  const places = (story.countries || []).filter(Boolean);

  // A drop cap needs a paragraph to sit in. On two lines of summary it just
  // looks like a typo, so it is spent on the opening entry only, and only when
  // the story's own template asked for one.
  const dropCap = first && style.dropCap && (story.summary || '').length > 140;

  const cover = story.coverImageUrl || story.coverVideoThumbUrl;

  return (
    <Box
      component="article"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '140px minmax(0, 1fr)' },
        gap: { xs: 1.5, md: 4 },
        py: { xs: 4, md: 5 },
        borderTop: `1px solid ${theme.custom.surface.border}`,
        '&:first-of-type': { borderTop: 'none', pt: { xs: 2, md: 2.5 } },
      }}
    >
      {/* The margin. On a real diary this is where the date lives, and keeping
          it out of the text column is what stops the entry reading as a card. */}
      <Box sx={{ pt: { md: 1 } }}>
        {date && (
          <Typography
            variant="overline"
            sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.5 }}
          >
            {date}
          </Typography>
        )}
        {places.length > 0 && (
          <Typography
            sx={{
              fontSize: 13,
              color: 'text.secondary',
              mt: { xs: 0, md: 0.5 },
              display: { xs: 'none', md: 'block' },
            }}
          >
            {places.slice(0, 3).join(', ')}
          </Typography>
        )}
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Typography
          component="h3"
          onClick={open}
          sx={{
            fontFamily: theme.custom.fontDisplay,
            fontWeight: 700,
            fontSize: { xs: '1.5rem', md: '1.875rem' },
            lineHeight: 1.2,
            letterSpacing: '-0.015em',
            color: 'text.primary',
            cursor: 'pointer',
            maxWidth: `${style.measure}ch`,
            '&:hover': { color: 'primary.main' },
          }}
        >
          {story.title}
        </Typography>

        {cover && (
          <Box
            onClick={open}
            sx={{
              mt: 2,
              maxWidth: `${style.measure + 12}ch`,
              // A fixed height rather than a ratio. At this column width 16:9
              // came out near 400px tall, so a single entry filled the viewport
              // and the diary stopped reading as a sequence.
              height: { xs: 190, sm: 240, md: 300 },
              borderRadius: '14px',
              overflow: 'hidden',
              cursor: 'pointer',
              bgcolor: theme.custom.surface.active,
            }}
          >
            <Box
              component="img"
              src={cover}
              alt=""
              loading="lazy"
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                transition: `transform ${theme.custom.motion.duration.slow} ${theme.custom.motion.easing.standard}`,
                '&:hover': { transform: 'scale(1.02)' },
              }}
            />
          </Box>
        )}

        {story.summary && (
          <Typography
            sx={{
              mt: 2.5,
              maxWidth: `${style.measure}ch`,
              fontSize: { xs: '1.0625rem', md: '1.125rem' },
              lineHeight: 1.75,
              color: 'text.primary',
              ...(dropCap
                ? {
                    '&::first-letter': {
                      float: 'left',
                      fontFamily: theme.custom.fontDisplay,
                      fontWeight: 700,
                      fontSize: '3.6rem',
                      lineHeight: 0.86,
                      paddingRight: '0.12em',
                      paddingTop: '0.06em',
                    },
                  }
                : {}),
            }}
          >
            {story.summary}
          </Typography>
        )}

        <Button
          onClick={open}
          endIcon={<IconArrowRight size={15} />}
          sx={{ mt: 2, px: 0, '&:hover': { bgcolor: 'transparent' } }}
        >
          Read the story
        </Button>
      </Box>
    </Box>
  );
};

const StoryDiary: React.FC<StoryDiaryProps> = ({ stories, title, subtitle, initial = 4 }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = React.useState(false);

  if (stories.length === 0) return null;

  const shown = expanded ? stories : stories.slice(0, initial);
  const hidden = stories.length - shown.length;

  return (
    <Box component="section" sx={{ mt: { xs: 5, md: 7 } }}>
      {/* A label, not a headline. An h4 here rendered smaller than the entry
          titles underneath it, so the section header read as a caption for the
          first story rather than as the thing introducing all of them. A diary
          does not announce itself; it just starts, dated. */}
      {title && (
        <Box
          sx={{
            mb: { xs: 2, md: 2.5 },
            pb: 1.25,
            borderBottom: `1px solid ${theme.custom.surface.border}`,
            display: 'flex',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Typography variant="overline" component="h2" sx={{ color: 'text.primary' }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      )}

      {shown.map((story, i) => (
        <DiaryEntry key={story.id} story={story} first={i === 0} />
      ))}

      {hidden > 0 && (
        <Button variant="outlined" onClick={() => setExpanded(true)} sx={{ mt: 3 }}>
          Read {hidden} more {hidden === 1 ? 'entry' : 'entries'}
        </Button>
      )}
    </Box>
  );
};

export default StoryDiary;
