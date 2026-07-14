import React from 'react';
import { Avatar, Box, Tooltip, Typography, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  IconCopy,
  IconHeart,
  IconHeartFilled,
  IconMapPin,
} from '@tabler/icons-react';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { apiServices } from '../../services/APIs/apiServices';
import { fetchUnsplashImage } from '../../services/unsplashService';
import ImageBadge from '../../components/ui/ImageBadge';
import { VIBES } from './vibes';

interface TripCardProps { trip: any; onClick: () => void; }

/** Published-trip card used on the Community explore grid and traveler profiles. */
const CommunityTripCard: React.FC<TripCardProps> = ({ trip, onClick }) => {
  const theme = useTheme();
  const [photo, setPhoto] = React.useState<string | null>(trip.photoUrl || null);
  const [imgFailed, setImgFailed] = React.useState(false);

  React.useEffect(() => {
    if (trip.photoUrl && !imgFailed) { setPhoto(trip.photoUrl); return; }
    const query = (trip.countries?.[0] || trip.name || 'travel').split(',')[0];
    let cancelled = false;
    fetchUnsplashImage(query).then(url => { if (!cancelled && url) setPhoto(url); });
    return () => { cancelled = true; };
  }, [trip.photoUrl, trip.countries, trip.name, imgFailed]);

  const vibe = VIBES[trip.vibe?.toLowerCase?.()] || null;
  const nights = typeof trip.totalNights === 'number' ? trip.totalNights
    : typeof trip.targetNights === 'number' ? trip.targetNights : null;
  // Backend returns owner as { id, name, profilePicture } (TripUserDto)
  const ownerName = trip.owner?.name?.trim() || trip.ownerName || trip.OwnerName || 'Explorer';
  const ownerAvatar = trip.owner?.profilePicture || trip.ownerAvatar || trip.OwnerAvatar || null;
  const countries: string[] = Array.isArray(trip.countries) ? trip.countries : [];

  const metaLine = [
    ...countries.slice(0, 2),
    countries.length > 2 ? `+${countries.length - 2}` : null,
    nights !== null ? `${nights} ${nights === 1 ? 'night' : 'nights'}` : null,
  ].filter(Boolean).join(' · ');

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
      // silently ignore ,user stays on the page
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

  React.useEffect(() => {
    if (!trip.id) return;
    let cancelled = false;
    apiServices.getTripReactions(token, trip.id)
      .then(resp => { if (!cancelled) applySummary(resp.data); })
      .catch(() => { /* keep zeros on failure */ });
    return () => { cancelled = true; };
  }, [trip.id, token, applySummary]);

  const footerActionSx = {
    display: 'inline-flex', alignItems: 'center', gap: 0.5,
    border: 'none', bgcolor: 'transparent', p: 0.5, borderRadius: 999,
    fontFamily: 'inherit', fontSize: 12.5, fontWeight: 650, lineHeight: 1,
    color: 'text.secondary', cursor: 'pointer',
    transition: `color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
    '&:hover': { color: 'primary.main' },
  } as const;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={onClick}
      style={{ cursor: 'pointer', height: '100%', minWidth: 0 }}
    >
      <Box sx={{
        height: '100%', minWidth: 0, display: 'flex', flexDirection: 'column',
        borderRadius: '16px', overflow: 'hidden',
        border: `1px solid ${theme.custom.surface.border}`,
        bgcolor: 'background.paper',
        boxShadow: theme.custom.shadows.card,
        transition: `box-shadow ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}`,
        '&:hover': { boxShadow: theme.custom.shadows.cardHover },
        '&:hover .trip-cover img': { transform: 'scale(1.04)' },
      }}>
        {/* Cover image */}
        <Box className="trip-cover" sx={{ position: 'relative', aspectRatio: '4 / 3', overflow: 'hidden', bgcolor: theme.custom.surface.active }}>
          {photo ? (
            <Box
              component="img" src={photo} alt={trip.name || 'Trip photo'}
              onError={() => setImgFailed(true)}
              sx={{
                width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                transition: `transform ${theme.custom.motion.duration.slow} ${theme.custom.motion.easing.standard}`,
              }}
            />
          ) : (
            <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconMapPin size={30} stroke={1.5} color={theme.palette.text.disabled} />
            </Box>
          )}
          {vibe && (
            <ImageBadge sx={{ position: 'absolute', top: 12, left: 12 }}>
              <vibe.Icon size={12} stroke={2} />
              {vibe.label}
            </ImageBadge>
          )}
          {trip.tripStatus === 1 && (
            <ImageBadge sx={{ position: 'absolute', top: 12, right: 12 }}>
              <Box sx={{
                width: 6, height: 6, borderRadius: '50%', bgcolor: 'error.main',
                animation: 'livePulse 1.6s ease-in-out infinite',
                '@keyframes livePulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.35 } },
              }} />
              Live
            </ImageBadge>
          )}
        </Box>

        {/* Card body */}
        <Box sx={{ px: 1.75, pt: 1.5, pb: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
          <Typography noWrap sx={{ fontSize: 15, fontWeight: 650, letterSpacing: '-0.01em', color: 'text.primary' }}>
            {trip.name || 'Untitled Trip'}
          </Typography>
          {metaLine && (
            <Typography noWrap sx={{ fontSize: 13, color: 'text.secondary' }}>
              {metaLine}
            </Typography>
          )}

          {/* Footer row */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto', pt: 1.25 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
              <Avatar src={ownerAvatar || undefined} sx={{ width: 22, height: 22, fontSize: 10.5, bgcolor: 'primary.main' }}>
                {ownerName?.charAt(0).toUpperCase()}
              </Avatar>
              <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 600, color: 'text.secondary', maxWidth: 130 }}>
                {ownerName}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
              <Tooltip title={cloneLoading ? 'Cloning…' : 'Use as template'} arrow placement="top">
                <Box component="button" type="button" onClick={handleClone} sx={footerActionSx}>
                  <IconCopy size={15} stroke={1.9} />
                  {cloneCount > 0 && cloneCount}
                </Box>
              </Tooltip>
              <Box
                component="button" type="button" onClick={toggleLike}
                aria-label={liked ? 'Unlike trip' : 'Like trip'}
                sx={{ ...footerActionSx, color: liked ? 'primary.main' : 'text.secondary' }}
              >
                {liked
                  ? <IconHeartFilled size={15} color={theme.palette.primary.main} />
                  : <IconHeart size={15} stroke={1.9} />}
                {likeCount}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </motion.div>
  );
};

export default CommunityTripCard;
