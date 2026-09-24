/**
 * A published story in a grid or a rail.
 *
 * Deliberately NOT the same object as CommunityTripCard. A trip card is a
 * document: landscape, bordered, white body, sans type, a route and a row of
 * figures. A story card is a magazine page: portrait, borderless, the photograph
 * running edge to edge with the type set on top of it. The two used to share
 * ~90% of a shell and differed only by an aspect ratio, which meant the one
 * product that makes both a plan and the story of how it went showed them as
 * indistinguishable tiles.
 *
 * The silhouette carries the meaning here, not decoration: 4:5 against the trip
 * card's 16:10 is recognisable at thumbnail size, across a scroll, and to
 * someone who has never used the site before.
 *
 * A video cover shows its poster and never plays. One moving image per page, and
 * on a grid that budget belongs to nothing.
 */

import React from 'react';
import { Avatar, Box, Tooltip, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  IconBook,
  IconPhoto,
  IconPlayerPlayFilled,
  IconHeart,
  IconMessageCircleQuestion,
} from '@tabler/icons-react';
import ImageBadge from '../../components/ui/ImageBadge';
import CardTypeTag from '../../components/ui/CardTypeTag';
import { STORY_TEMPLATES } from '../render/templates';
import { VIBES } from '../../pages/CommunityPage/vibes';
import { storyPath } from '../storySlug';
import { resolveStoryCover, formatTravelWindow } from '../storyFormat';
import { SCRIM, INK, INK_MUTED, storyWash } from './storyJacket';
import type { AfterStorySummaryDto } from '../types';

interface StoryCardProps {
  story: AfterStorySummaryDto;
  /** Fixed width turns the card into a horizontal-strip item instead of a grid cell. */
  width?: number;
  /**
   * Opens the book preview. Only passed where the viewer is the author, since
   * the preview endpoint is authorship-gated and would 404 for anyone else.
   * Omitted everywhere the card is just a way into the story.
   */
  onBook?: (story: AfterStorySummaryDto) => void;
}

/** The small round control that sits over the photograph, top right. */
const PUCK = {
  display: 'grid',
  placeItems: 'center',
  width: 28,
  height: 28,
  borderRadius: '50%',
  color: '#fff',
  bgcolor: 'rgba(10,10,13,0.55)',
  backdropFilter: 'blur(4px)',
} as const;

const StoryCard: React.FC<StoryCardProps> = ({ story, width, onBook }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [failed, setFailed] = React.useState(false);

  const cover = resolveStoryCover(story, failed);
  const vibe = story.vibe ? VIBES[story.vibe] : null;
  const wash = storyWash(story.vibe);

  // The SHAPE of the story: Journal, Guide, Photo essay, Postcard. What kind of
  // thing this is now comes from the corner ribbon, so this went back to saying
  // something the reader does not already know.
  const kicker = STORY_TEMPLATES[story.template]?.label ?? 'Story';
  const when = formatTravelWindow(story.travelStartDate);

  const open = () => navigate(storyPath(story));

  return (
    <Box
      component="article"
      onClick={open}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
      role="link"
      tabIndex={0}
      aria-label={`Read ${story.title}`}
      sx={{
        position: 'relative',
        cursor: 'pointer',
        overflow: 'hidden',
        borderRadius: '16px',
        // No border. A photograph is already a rectangle; framing it draws a
        // second one and is what made these read as tiles rather than pages.
        aspectRatio: '4 / 5',
        // Behind a missing or still-loading cover. Dark on purpose so the type
        // treatment below never has to change: a text-only card reads as a
        // deliberate cover, where white-on-white reads as broken.
        background: cover ? '#15151A' : wash,
        boxShadow: theme.custom.shadows.card,
        transition: `box-shadow ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}, transform ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}`,
        // `alignSelf` opts out of grid stretch so the aspect ratio, not the row
        // height, decides the shape.
        ...(width ? { flex: '0 0 auto', width } : { alignSelf: 'start', width: '100%' }),
        '&:hover': { boxShadow: theme.custom.shadows.cardHover, transform: 'translateY(-3px)' },
        '&:hover .story-card-img': { transform: 'scale(1.05)' },
        '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
      }}
    >
      {cover ? (
        <Box
          component="img"
          className="story-card-img"
          src={cover}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: `transform ${theme.custom.motion.duration.slow} ${theme.custom.motion.easing.standard}`,
          }}
        />
      ) : null}

      {/* The scrim only has a photograph to fight when there is one. Over the
          typographic wash it would just flatten a considered gradient. */}
      {cover && <Box sx={{ position: 'absolute', inset: 0, background: SCRIM, pointerEvents: 'none' }} />}

      {vibe && (
        <Box sx={{ position: 'absolute', top: 12, left: 12 }}>
          <ImageBadge>
            <vibe.Icon size={12} />
            {vibe.label}
          </ImageBadge>
        </Box>
      )}

      <CardTypeTag kind="story" />

      {/* Top right, because the bottom of the card is now type. A row rather
          than two absolutely positioned pucks, so the book action and the video
          badge cannot land on top of each other on a video story.

          Below the type ribbon, which hangs from the top edge in the same
          corner. */}
      {(story.coverKind === 'Video' || onBook) && (
        <Box sx={{ position: 'absolute', top: 42, right: 12, display: 'flex', gap: 0.75 }}>
          {onBook && (
            <Tooltip title="See it as a book" arrow>
              <Box
                component="button"
                type="button"
                aria-label="See it as a book"
                // The whole card is the link to the story, so this has to stop
                // the click before it bubbles or the preview never opens.
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onBook(story);
                }}
                sx={{ ...PUCK, border: 'none', cursor: 'pointer', p: 0 }}
              >
                <IconBook size={13} />
              </Box>
            </Tooltip>
          )}
          {/* A still frame with a play badge, so it is obvious the story opens
              with video without anything actually starting here. */}
          {story.coverKind === 'Video' && (
            <Box sx={PUCK}>
              <IconPlayerPlayFilled size={12} />
            </Box>
          )}
        </Box>
      )}

      <Box
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.75,
        }}
      >
        <Typography
          variant="overline"
          sx={{ color: INK_MUTED, lineHeight: 1.2, display: 'block' }}
          noWrap
        >
          {when ? `${kicker} · ${when}` : kicker}
        </Typography>

        {/* Without a photograph the title IS the cover, so it sets a step larger
            and takes more lines. With one, it stays out of the picture's way. */}
        <Typography
          variant={cover ? 'h5' : 'h3'}
          component="h3"
          sx={{
            fontFamily: theme.custom.fontDisplay,
            fontWeight: 700,
            lineHeight: 1.18,
            letterSpacing: '-0.015em',
            color: INK,
            display: '-webkit-box',
            WebkitLineClamp: cover ? 3 : 5,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {story.title}
        </Typography>

        {story.destination && (
          <Typography variant="body2" sx={{ color: INK_MUTED }} noWrap>
            {story.destination}
          </Typography>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.75 }}>
          <Avatar
            src={story.author?.profilePicture ?? undefined}
            sx={{ width: 22, height: 22, bgcolor: 'primary.main', typography: 'caption' }}
          >
            {story.author?.displayName?.[0] ?? 'T'}
          </Avatar>
          <Typography variant="caption" sx={{ color: INK_MUTED, minWidth: 0 }} noWrap>
            {story.author?.displayName ?? 'A traveller'}
          </Typography>

          <Box sx={{ flex: 1 }} />

          {/* Each counter appears only once it has something to report. A row of
              zeroes on a new story reads as "nobody cared", which is both untrue
              and the worst possible first impression. */}
          {story.photoCount > 0 && (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, color: INK_MUTED }}>
              <IconPhoto size={13} />
              <Typography variant="caption">{story.photoCount}</Typography>
            </Box>
          )}
          {story.likeCount > 0 && (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, color: INK_MUTED }}>
              <IconHeart size={13} />
              <Typography variant="caption">{story.likeCount}</Typography>
            </Box>
          )}
          {story.questionCount > 0 && (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, color: INK_MUTED }}>
              <IconMessageCircleQuestion size={13} />
              <Typography variant="caption">{story.questionCount}</Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default StoryCard;
