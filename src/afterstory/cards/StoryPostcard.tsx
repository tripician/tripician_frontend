import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { IconArrowRight } from '@tabler/icons-react';
import { STORY_TEMPLATES } from '../render/templates';
import { formatTravelWindow } from '../storyFormat';
import { SCRIM, INK, INK_MUTED, storyWash } from './storyJacket';
import type { PostAttachment, StoryPreview } from '../../posts/types';

interface StoryPostcardProps {
  attachment: PostAttachment;
  story: StoryPreview;
}

const TEMPLATE_LABELS = STORY_TEMPLATES as Record<string, { label: string }>;

// A story on the wall: its cover with the title set on it, then its opening lines, so the post is worth stopping for.
const StoryPostcard: React.FC<StoryPostcardProps> = ({ attachment, story }) => {
  const theme = useTheme();
  const [coverFailed, setCoverFailed] = React.useState(false);
  const cover = coverFailed ? null : attachment.coverUrl;
  const when = formatTravelWindow(story.travelStartDate, story.travelEndDate);
  const kicker = TEMPLATE_LABELS[story.template]?.label ?? 'Story';
  const summary = story.summary?.trim();

  return (
    <Box
      component={RouterLink}
      to={attachment.href}
      // The post card is a link to the post; this one goes to the story, so the click stops here.
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      aria-label={`Read ${attachment.title}`}
      sx={{
        display: 'block',
        mb: 1,
        borderRadius: '12px',
        overflow: 'hidden',
        border: `1px solid ${theme.custom.surface.border}`,
        bgcolor: 'background.paper',
        color: 'inherit',
        textDecoration: 'none',
        transition: `border-color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
        '&:hover': { borderColor: 'text.disabled' },
        '&:hover .story-postcard-img': { transform: 'scale(1.03)' },
        '&:hover .story-postcard-cta': { color: 'primary.main' },
        '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          // Without a photograph the title is the cover, and a shorter jacket keeps it from being a dark slab.
          aspectRatio: cover ? '16 / 9' : '3 / 1',
          background: cover ? '#15151A' : storyWash(story.vibe),
        }}
      >
        {cover && (
          <>
            <Box
              component="img"
              className="story-postcard-img"
              src={cover}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setCoverFailed(true)}
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: `transform ${theme.custom.motion.duration.slow} ${theme.custom.motion.easing.standard}`,
              }}
            />
            <Box sx={{ position: 'absolute', inset: 0, background: SCRIM, pointerEvents: 'none' }} />
          </>
        )}

        <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, p: { xs: 1.5, sm: 2 }, display: 'grid', gap: 0.5 }}>
          <Typography variant="overline" noWrap sx={{ color: INK_MUTED, lineHeight: 1.2 }}>
            {when ? `${kicker} · ${when}` : kicker}
          </Typography>
          <Typography
            variant={cover ? 'h5' : 'h4'}
            component="h3"
            sx={{
              fontFamily: theme.custom.fontDisplay,
              fontWeight: 700,
              lineHeight: 1.18,
              letterSpacing: '-0.01em',
              color: INK,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {attachment.title}
          </Typography>
          {attachment.meta && (
            <Typography variant="body2" noWrap sx={{ color: INK_MUTED }}>
              {attachment.meta}
            </Typography>
          )}
        </Box>
      </Box>

      <Box sx={{ px: 1.75, pt: summary ? 1.25 : 1, pb: 1.25 }}>
        {summary && (
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              lineHeight: 1.6,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              mb: 1,
            }}
          >
            {summary}
          </Typography>
        )}
        <Box
          className="story-postcard-cta"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            fontSize: 13,
            fontWeight: 700,
            color: 'text.primary',
            transition: `color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
          }}
        >
          Read the story
          <IconArrowRight size={14} stroke={2.2} />
        </Box>
      </Box>
    </Box>
  );
};

export default StoryPostcard;
