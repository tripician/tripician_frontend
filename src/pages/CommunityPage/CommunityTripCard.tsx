import React from 'react';
import { Box, Tooltip, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  IconCopy,
  IconHeart,
  IconHeartFilled,
  IconMessageCircle2,
} from '@tabler/icons-react';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { apiServices } from '../../services/APIs/apiServices';
import { useTripCover } from '../../utils/tripCover';
import { tripNights } from '../../utils/tripMeta';
import TripListingCard from '../../components/ui/TripListingCard';
import type { TripListingPerson } from '../../components/ui/TripListingCard';
import ImageBadge from '../../components/ui/ImageBadge';
import { VIBES } from './vibes';

interface TripCardProps { trip: any; onClick: () => void; }

/**
 * A published trip on Community, Templates and public profiles.
 *
 * The shell, the cover treatment and every listing row live in
 * `components/ui/TripListingCard`. What remains here is the part that is
 * genuinely this surface's own: resolving a cover through the shared helper,
 * reading the DTO's two casings, and the community actions (comment count,
 * clone, like).
 *
 * Price and spots are deliberately not passed. A published itinerary is
 * something to read and copy, not something to join - those rows arrive with
 * recruitment, on the same component.
 */
const CommunityTripCard: React.FC<TripCardProps> = ({ trip, onClick }) => {
  const theme = useTheme();
  // Resolved through the shared hook so this card, the profile card and the
  // trip's own hero all land on the same photo. See utils/tripCover.ts.
  const photo = useTripCover(trip);

  const vibe = VIBES[trip.vibe?.toLowerCase?.()] || null;
  // Backend returns owner as { id, name, profilePicture } (TripUserDto)
  const ownerId = trip.owner?.id ?? trip.ownerUserId ?? trip.OwnerUserId ?? null;
  const ownerName = trip.owner?.name?.trim() || trip.ownerName || trip.OwnerName || 'Explorer';
  const ownerAvatar = trip.owner?.profilePicture || trip.ownerAvatar || trip.OwnerAvatar || null;
  const countries: string[] = Array.isArray(trip.countries) ? trip.countries : [];
  const isOpen = trip.joinPolicy === 'OpenToRequests';

  /** Shared with Profile, so one trip cannot be two lengths on two pages. */
  const nights = React.useMemo(() => tripNights(trip), [trip]);

  /** Everyone going besides the owner. The shell drops the owner if one slips in. */
  const members = React.useMemo<TripListingPerson[]>(() => {
    const raw = Array.isArray(trip.members) ? trip.members
      : Array.isArray(trip.Members) ? trip.Members : [];
    return raw.map((m: any) => ({
      id: m.id ?? m.Id ?? null,
      name: (m.name || m.Name || '').trim() || 'Traveller',
      avatar: m.profilePicture || m.ProfilePicture || m.profilePic || null,
    }));
  }, [trip.members, trip.Members]);

  const [liked, setLiked] = React.useState(false);
  const [likeCount, setLikeCount] = React.useState(
    typeof trip.likesCount === 'number' ? trip.likesCount :
    typeof trip.likes === 'number' ? trip.likes : 0
  );
  const reactionBusyRef = React.useRef<Record<string, boolean>>({});
  const navigate = useNavigate();
  const { token } = useAuthToken();

  const [cloneLoading, setCloneLoading] = React.useState(false);
  const [cloneCount, setCloneCount] = React.useState(
    typeof trip.cloneCount === 'number' ? trip.cloneCount : 0
  );
  const commentCount: number =
    typeof trip.commentsCount === 'number' ? trip.commentsCount :
    typeof trip.CommentsCount === 'number' ? trip.CommentsCount : 0;

  const handleClone = React.useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) { navigate('/signin'); return; }
    if (cloneLoading || !trip.id) return;
    setCloneLoading(true);
    try {
      const resp = await apiServices.cloneTrip(token, trip.id);
      const newTripId = resp.data?.tripId;
      if (newTripId) {
        setCloneCount((c: number) => c + 1);
        navigate(`/tripplanner/${newTripId}`);
      }
    } catch {
      // silently ignore - user stays on the page
    } finally {
      setCloneLoading(false);
    }
  }, [trip.id, token, navigate, cloneLoading]);

  const applySummary = React.useCallback((s: any) => {
    if (!s) return;
    setLikeCount(Math.max(0, Number(s.likes) || 0));
    setLiked(!!s.userLiked);
  }, []);

  const toggleLike = React.useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!trip.id) return;
    if (!token) { navigate('/signin'); return; }
    if (reactionBusyRef.current.like) return;
    reactionBusyRef.current.like = true;
    try {
      const resp = await apiServices.toggleTripReaction(token, trip.id, 'like');
      applySummary(resp.data);
    } catch {
      // keep previous state on failure
    } finally {
      reactionBusyRef.current.like = false;
    }
  }, [trip.id, token, navigate, applySummary]);

  // KNOWN COST: one request per card, so a 30-trip grid is 30 requests. The only
  // thing it adds over the payload is whether YOU liked this trip, which the list
  // endpoint does not return. Fixing it properly means adding `userLiked` to the
  // list DTO rather than papering over it here.
  React.useEffect(() => {
    if (!trip.id) return;
    let cancelled = false;
    apiServices.getTripReactions(token, trip.id)
      .then(resp => { if (!cancelled) applySummary(resp.data); })
      .catch(() => { /* keep zeros on failure */ });
    return () => { cancelled = true; };
  }, [trip.id, token, applySummary]);

  const actionSx = {
    display: 'inline-flex', alignItems: 'center', gap: 0.5,
    border: 'none', bgcolor: 'transparent', p: 0.5, borderRadius: 999,
    fontFamily: 'inherit', fontWeight: 600, lineHeight: 1,
    typography: 'caption',
    color: 'text.secondary', cursor: 'pointer',
    transition: `color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
    '&:hover': { color: 'primary.main' },
  } as const;

  return (
    <TripListingCard
      images={[photo]}
      title={trip.name || 'Untitled Trip'}
      onClick={onClick}
      countries={countries}
      host={{ id: ownerId, name: ownerName, avatar: ownerAvatar, verified: trip.owner?.identityVerified === true }}
      members={members}
      rating={typeof trip.rating === 'number' ? trip.rating : null}
      description={typeof trip.description === 'string' ? trip.description.trim() : null}
      createdAt={trip.createdDate ?? trip.CreatedDate ?? null}
      updatedAt={trip.updatedDate ?? trip.UpdatedDate ?? null}
      verified={trip.verified ?? trip.Verified}
      verifiedAt={trip.verifiedAt ?? trip.VerifiedAt}
      nights={nights}
      confirmed={trip.confirmed === true}
      price={
        isOpen && typeof trip.pricePerPerson === 'number'
          ? { amount: trip.pricePerPerson, currency: trip.priceCurrency }
          : null
      }
      spotsLeft={isOpen && typeof trip.spotsLeft === 'number' ? trip.spotsLeft : null}
      coverBadges={
        vibe ? (
          <ImageBadge>
            <vibe.Icon size={12} stroke={2} />
            {vibe.label}
          </ImageBadge>
        ) : null
      }
      coverStatus={
        trip.tripStatus === 1 ? (
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
      footer={
        /* Actions only. Tripician Verified used to sit on this row and now rides
           beside the title, where an endorsement is read rather than counted. */
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
          {/* Comments sit first: the conversation on a trip is the point of a
              community, and it's the signal that invites someone to open it. */}
          <Tooltip
            title={commentCount > 0
              ? `${commentCount} ${commentCount === 1 ? 'comment' : 'comments'}`
              : 'Be the first to comment'}
            arrow
            placement="top"
          >
            <Box sx={{ ...actionSx, cursor: 'inherit' }}>
              <IconMessageCircle2 size={15} stroke={1.9} />
              {commentCount > 0 && commentCount}
            </Box>
          </Tooltip>
          <Tooltip title={cloneLoading ? 'Cloning…' : 'Use as template'} arrow placement="top">
            <Box component="button" type="button" onClick={handleClone} sx={actionSx}>
              <IconCopy size={15} stroke={1.9} />
              {cloneCount > 0 && cloneCount}
            </Box>
          </Tooltip>
          <Box
            component="button" type="button" onClick={toggleLike}
            aria-label={liked ? 'Unlike trip' : 'Like trip'}
            sx={{ ...actionSx, color: liked ? 'primary.main' : 'text.secondary' }}
          >
            {liked
              ? <IconHeartFilled size={15} color={theme.palette.primary.main} />
              : <IconHeart size={15} stroke={1.9} />}
            <Typography component="span" variant="caption" sx={{ fontWeight: 600 }}>{likeCount}</Typography>
          </Box>
        </Box>
      }
    />
  );
};

export default CommunityTripCard;
