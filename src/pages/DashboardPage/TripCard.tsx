import React from 'react';
import { Box, IconButton, LinearProgress, Tooltip, Typography } from '@mui/material';
import { IconBroadcast, IconMessageCircle2, IconShare2, IconTrash } from '@tabler/icons-react';
import ImageBadge from '../../components/ui/ImageBadge';
import { VIBES } from '../CommunityPage/vibes';
import TripListingCard from '../../components/ui/TripListingCard';
import type { TripListingHost, TripListingPerson } from '../../components/ui/TripListingCard';
import { useTripCover } from '../../utils/tripCover';

interface TripCardProps {
  title: string;
  image?: string;
  description?: string;
  progress?: number;
  /** ISO. Drives "updated 3mo ago". */
  createdAt?: string | null;
  updatedAt?: string | null;
  /** Length of the plan. Derived by the view model, not here, so it matches Community. */
  nights?: number | null;
  members?: { name: string; profilePic: string; id?: string }[];
  owner?: { id?: string; name: string; profilePic?: string; identityVerified?: boolean } | null;
  countries?: string[];
  /** Travel personality key. Same cover pill Community shows on the same trip. */
  vibe?: string;
  likes?: number;
  onClick?: () => void;
  onShare?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  tripStatus?: number;
  /** Tripician Verified. Set by an admin; the owner cannot grant it. */
  verified?: boolean;
  verifiedAt?: string | null;
  isOwner?: boolean;
  onGoLive?: () => void;
  /** Comments left by the community on this trip, replies included. */
  commentsCount?: number;
}

/**
 * Your own trip, on your profile.
 *
 * Every row is the shared one: same cover, same crew over its top-right corner,
 * same title, description, age and dates as the identical trip seen from
 * Community. Only the `footer` differs, and only because this is the one place a
 * trip is a thing you EDIT rather than a thing you read - go live, share, delete.
 *
 * Price and seats stay unset: your own planning grid is not a shop window.
 */
const TripCard: React.FC<TripCardProps> = ({
  title, image, description, progress, createdAt, updatedAt, nights,
  members, owner, countries, vibe, onClick, onShare, onDelete, tripStatus, isOwner, onGoLive,
  commentsCount, verified, verifiedAt,
}) => {
  // `image` is already the banner or the curated country cover; the hook adds the
  // async fallback for the countries that have neither, which Community already
  // had and this card did not.
  const photo = useTripCover({ bannerPhotoUrl: image || null, countries, name: title });

  const crew = React.useMemo<TripListingPerson[]>(
    () => (members ?? []).map((m) => ({ id: m.id, name: m.name, avatar: m.profilePic })),
    [members],
  );

  const host = React.useMemo<TripListingHost | null>(
    () => (owner ? {
      id: owner.id,
      name: owner.name,
      avatar: owner.profilePic ?? null,
      verified: owner.identityVerified === true,
    } : null),
    [owner],
  );

  const pct = typeof progress === 'number' ? Math.min(100, Math.max(0, progress)) : 0;
  const inProgress = pct > 0 && pct < 100;
  const vibeMeta = vibe ? VIBES[vibe.toLowerCase()] ?? null : null;

  const actionSx = {
    color: 'text.secondary',
    p: 0.6,
    '&:hover': { color: 'text.primary' },
  } as const;

  return (
    <TripListingCard
      images={[photo]}
      title={title}
      onClick={onClick ?? (() => {})}
      countries={countries}
      host={host}
      members={crew}
      description={description || null}
      createdAt={createdAt}
      updatedAt={updatedAt}
      verified={verified}
      verifiedAt={verifiedAt}
      nights={nights}
      coverBadges={
        /* Vibe first, so it sits where Community puts it; plan progress under it,
           which is the one pill only an owner has any use for. */
        <>
          {vibeMeta && (
            <ImageBadge>
              <vibeMeta.Icon size={12} stroke={2} />
              {vibeMeta.label}
            </ImageBadge>
          )}
          {inProgress && <ImageBadge>{pct}% planned</ImageBadge>}
        </>
      }
      coverStatus={
        tripStatus === 1 ? (
          <ImageBadge>
            <Box sx={{
              width: 6, height: 6, borderRadius: '50%', bgcolor: 'error.main',
              animation: 'livePulse 1.6s ease-in-out infinite',
              '@keyframes livePulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.35 } },
            }} />
            Live
          </ImageBadge>
        ) : null
      }
      underCover={
        inProgress ? <LinearProgress variant="determinate" value={pct} sx={{ height: 3, borderRadius: 0 }} /> : null
      }
      footer={
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          {/* Replies on your own published trip - the nudge to go read them. */}
          {typeof commentsCount === 'number' && commentsCount > 0 ? (
            <Tooltip title={`${commentsCount} ${commentsCount === 1 ? 'comment' : 'comments'} on this trip`} arrow placement="top">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, flexShrink: 0, color: 'text.secondary' }}>
                <IconMessageCircle2 size={14} stroke={1.9} />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>{commentsCount}</Typography>
              </Box>
            </Tooltip>
          ) : <Box />}

          <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            {isOwner && tripStatus === 0 && onGoLive && (
              <Tooltip title="Go live & share your trip in real time" arrow placement="top">
                <IconButton size="small" onClick={() => onGoLive()} sx={{ ...actionSx, '&:hover': { color: 'error.main' } }} aria-label="Go live">
                  <IconBroadcast size={16} stroke={1.9} />
                </IconButton>
              </Tooltip>
            )}
            {onShare && (
              <Tooltip title="Share" arrow placement="top">
                <IconButton size="small" onClick={(e) => onShare(e)} sx={actionSx} aria-label="Share trip">
                  <IconShare2 size={16} stroke={1.9} />
                </IconButton>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip title="Delete" arrow placement="top">
                <IconButton size="small" onClick={(e) => onDelete(e)} sx={{ ...actionSx, '&:hover': { color: 'error.main' } }} aria-label="Delete trip">
                  <IconTrash size={16} stroke={1.9} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      }
    />
  );
};

export default TripCard;
