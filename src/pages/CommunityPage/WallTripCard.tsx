/**
 * A published trip on the community wall.
 *
 * The wall is one surface showing two kinds of thing, so both have to share a
 * silhouette or it reads as two grids that collided. `StoryCard` already set that
 * silhouette: 4:5, borderless, the photograph edge to edge with the type on top
 * of it. This is the same jacket cut for a trip.
 *
 * That is a deliberate reversal of the rule `CommunityTripCard` follows, where a
 * landscape bordered document sits against a portrait borderless page so the two
 * are legible apart. On a catalogue that distinction earns its keep. On a wall it
 * is the thing stopping the wall from being one.
 *
 * `TripListingCard` is untouched and stays the anatomy everywhere else, which is
 * why this is a separate component rather than a variant prop on that one.
 *
 * No like or clone button. Both live on the trip itself, and dropping them takes
 * the per-card reactions request with them: the old card fired one lookup per
 * trip on mount purely to learn whether YOU had liked it, so a thirty-card grid
 * was thirty requests before anybody scrolled.
 */

import React from 'react';
import { Avatar, Box, Typography, useTheme } from '@mui/material';
import { IconMessageCircle2, IconMoon, IconUsersPlus } from '@tabler/icons-react';
import ImageBadge from '../../components/ui/ImageBadge';
import CardTypeTag from '../../components/ui/CardTypeTag';
import VerifiedTripBadge from '../../components/CommonComponents/VerifiedTripBadge';
import { describeSpots } from '../../seats/types';
import { useTripCover } from '../../utils/tripCover';
import { tripNights } from '../../utils/tripMeta';
import { VIBES } from './vibes';

interface WallTripCardProps {
  trip: any;
  onClick: () => void;
}

// Type on a photograph needs its own darkening; the theme's surfaces are tuned
// for type on paper. Neutral, never brand coral. Same four stops as StoryCard,
// because a two-stop fade bands visibly across an image this size.
const SCRIM =
  'linear-gradient(to top, rgba(10,10,13,0.94) 0%, rgba(10,10,13,0.78) 26%, rgba(10,10,13,0.34) 52%, rgba(10,10,13,0) 76%)';

const INK = 'rgba(255,255,255,0.96)';
const INK_MUTED = 'rgba(255,255,255,0.74)';

/** Behind a trip with no photograph. Neutral dark, so the type treatment never has to change. */
const NO_COVER = 'linear-gradient(150deg, #23232A 0%, #101015 100%)';

const WallTripCard: React.FC<WallTripCardProps> = ({ trip, onClick }) => {
  const theme = useTheme();
  const photo = useTripCover(trip);
  const [failed, setFailed] = React.useState(false);

  const cover = failed ? null : photo;
  const vibe = VIBES[trip.vibe?.toLowerCase?.()] || null;
  const nights = React.useMemo(() => tripNights(trip), [trip]);

  // A trip a group runs is shown as theirs, the way the trip page already bylines it.
  const orgName: string | null = typeof trip.organizationName === 'string' && trip.organizationName.trim() ? trip.organizationName.trim() : null;
  const ownerName = orgName ?? (trip.owner?.name?.trim() || trip.ownerName || trip.OwnerName || 'Explorer');
  const ownerAvatar = orgName ? trip.organizationLogoUrl ?? null : trip.owner?.profilePicture || trip.ownerAvatar || trip.OwnerAvatar || null;
  const countries: string[] = Array.isArray(trip.countries) ? trip.countries : [];
  const isOpen = (trip.joinPolicy ?? trip.JoinPolicy) === 'OpenToRequests';
  const verified = trip.verified ?? trip.Verified;

  const commentCount: number =
    typeof trip.commentsCount === 'number' ? trip.commentsCount
      : typeof trip.CommentsCount === 'number' ? trip.CommentsCount : 0;

  // Where, then how long. Both are facts off the trip, and neither repeats the
  // title, which usually already names the place.
  const kicker = [
    countries.slice(0, 2).join(' · '),
    nights ? `${nights} ${nights === 1 ? 'night' : 'nights'}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <Box
      component="article"
      onClick={onClick}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      role="link"
      tabIndex={0}
      aria-label={`Open ${trip.name || 'this trip'}`}
      sx={{
        position: 'relative',
        cursor: 'pointer',
        overflow: 'hidden',
        borderRadius: '16px',
        aspectRatio: '4 / 5',
        alignSelf: 'start',
        width: '100%',
        background: cover ? '#15151A' : NO_COVER,
        boxShadow: theme.custom.shadows.card,
        transition: `box-shadow ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}, transform ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}`,
        '&:hover': { boxShadow: theme.custom.shadows.cardHover, transform: 'translateY(-3px)' },
        '&:hover .wall-card-img': { transform: 'scale(1.05)' },
        '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
      }}
    >
      {cover ? (
        <Box
          component="img"
          className="wall-card-img"
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

      {cover && <Box sx={{ position: 'absolute', inset: 0, background: SCRIM, pointerEvents: 'none' }} />}

      {/* Stacked, because a recruiting trip carries both and side by side they
          run under the corner ribbon on a narrow column. */}
      <Box sx={{ position: 'absolute', top: 12, left: 12, display: 'flex', flexDirection: 'column', gap: 0.75, alignItems: 'flex-start' }}>
        {vibe && (
          <ImageBadge>
            <vibe.Icon size={12} stroke={2} />
            {vibe.label}
          </ImageBadge>
        )}
        {isOpen && trip.spotsLeft !== 0 && (
          <ImageBadge sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
            <IconUsersPlus size={12} stroke={2} />
            {describeSpots({ spotsLeft: trip.spotsLeft ?? null }) ?? 'Looking for people'}
          </ImageBadge>
        )}
      </Box>

      <CardTypeTag kind="plan" />

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
        {kicker && (
          <Typography variant="overline" sx={{ color: INK_MUTED, lineHeight: 1.2, display: 'block' }} noWrap>
            {kicker}
          </Typography>
        )}

        {/* h5 is already the serif in this scale, so the jacket matches a story
            without naming a typeface or reaching for the editorial token, which
            the serif guard reserves for stories and blogs anyway. */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, minWidth: 0 }}>
          <Typography
            variant="h5"
            component="h3"
            sx={{
              color: INK,
              lineHeight: 1.18,
              letterSpacing: '-0.015em',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {trip.name || 'Untitled Trip'}
          </Typography>
          <VerifiedTripBadge verified={verified} verifiedAt={trip.verifiedAt ?? trip.VerifiedAt} />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.75 }}>
          <Avatar
            src={ownerAvatar ?? undefined}
            variant={orgName ? 'rounded' : 'circular'}
            sx={{ width: 22, height: 22, bgcolor: 'primary.main', typography: 'caption', ...(orgName ? { borderRadius: '6px' } : {}) }}
          >
            {ownerName[0]}
          </Avatar>
          <Typography variant="caption" sx={{ color: INK_MUTED, minWidth: 0 }} noWrap>
            {orgName ? `by ${orgName}` : ownerName}
          </Typography>

          <Box sx={{ flex: 1 }} />

          {/* Each counter appears only once it has something to report. A row of
              zeroes reads as "nobody cared", which on a new trip is untrue. */}
          {nights !== null && nights > 0 && (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, color: INK_MUTED }}>
              <IconMoon size={13} />
              <Typography variant="caption">{nights}</Typography>
            </Box>
          )}
          {commentCount > 0 && (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, color: INK_MUTED }}>
              <IconMessageCircle2 size={13} />
              <Typography variant="caption">{commentCount}</Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default WallTripCard;
