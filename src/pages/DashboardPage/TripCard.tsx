import React from 'react';
import { Avatar, AvatarGroup, Box, IconButton, LinearProgress, Tooltip, Typography, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { IconBroadcast, IconMapPin, IconShare2, IconTrash } from '@tabler/icons-react';
import ImageBadge from '../../components/ui/ImageBadge';

// Deterministic avatar colour from name/id - cycles through a warm palette
const AVATAR_COLORS = ['#FF385C', '#0EA5E9', '#0FA968', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
const avatarColor = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

interface TripCardProps {
  title: string;
  image?: string;
  description?: string;
  progress?: number;
  edited?: string;
  members?: { name: string; profilePic: string; id?: string }[];
  countries?: string[];
  likes?: number;
  owner?: string;
  onClick?: () => void;
  onShare?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  tripStatus?: number;
  isOwner?: boolean;
  onGoLive?: () => void;
}

/** Personal trip card for the dashboard: cover, plan progress, members, actions. */
const TripCard: React.FC<TripCardProps> = ({
  title, image, description, progress, edited, members, countries, onClick, onShare, onDelete, tripStatus, isOwner, onGoLive,
}) => {
  const theme = useTheme();

  const countryDisplay = React.useMemo(() => {
    if (!countries || countries.length === 0) return null;
    const normalize = (c: string) => c ? c.charAt(0).toUpperCase() + c.slice(1).toLowerCase() : c;
    const isReal = (c: string) => {
      if (!c || c.length > 30) return false;
      if (/[0-9]/.test(c)) return false;
      if (c.length > 15 && !/\s/.test(c)) return false;
      return true;
    };
    const unique = countries.filter((c, i, arr) => c && arr.indexOf(c) === i && isReal(c)).map(normalize);
    if (unique.length === 0) return null;
    return `${unique.slice(0, 2).join(' · ')}${unique.length > 2 ? ` · +${unique.length - 2}` : ''}`;
  }, [countries]);

  const pct = typeof progress === 'number' ? Math.min(100, Math.max(0, progress)) : 0;
  const inProgress = pct > 0 && pct < 100;

  const actionSx = {
    color: 'text.secondary',
    p: 0.6,
    '&:hover': { color: 'text.primary' },
  } as const;

  return (
    <motion.div whileHover={{ y: -4 }} style={{ height: '100%' }}>
      <Box
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={(e) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(); } }}
        sx={{
          height: '100%', display: 'flex', flexDirection: 'column',
          borderRadius: '16px', overflow: 'hidden',
          border: `1px solid ${theme.custom.surface.border}`,
          bgcolor: 'background.paper',
          boxShadow: theme.custom.shadows.card,
          cursor: onClick ? 'pointer' : 'default',
          transition: `box-shadow ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}`,
          '&:hover': { boxShadow: theme.custom.shadows.cardHover },
          '&:hover .trip-cover img': { transform: 'scale(1.04)' },
          '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
        }}
      >
        {/* Cover */}
        <Box className="trip-cover" sx={{ position: 'relative', aspectRatio: '16 / 10', overflow: 'hidden', bgcolor: theme.custom.surface.active }}>
          {image ? (
            <Box component="img" src={image} alt={title} sx={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              transition: `transform ${theme.custom.motion.duration.slow} ${theme.custom.motion.easing.standard}`,
            }} />
          ) : (
            <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconMapPin size={28} stroke={1.5} color={theme.palette.text.disabled} />
            </Box>
          )}
          {tripStatus === 1 && (
            <ImageBadge sx={{ position: 'absolute', top: 12, left: 12 }}>
              <Box sx={{
                width: 6, height: 6, borderRadius: '50%', bgcolor: 'error.main',
                animation: 'livePulse 1.6s ease-in-out infinite',
                '@keyframes livePulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.35 } },
              }} />
              Live
            </ImageBadge>
          )}
          {inProgress && (
            <ImageBadge sx={{ position: 'absolute', top: 12, right: 12 }}>{pct}% planned</ImageBadge>
          )}
        </Box>
        {inProgress && <LinearProgress variant="determinate" value={pct} sx={{ height: 3, borderRadius: 0 }} />}

        {/* Body */}
        <Box sx={{ px: 1.75, pt: 1.5, pb: 1.25, display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
          <Typography noWrap sx={{ fontSize: 15, fontWeight: 650, letterSpacing: '-0.01em', color: 'text.primary' }}>
            {title}
          </Typography>
          {countryDisplay && (
            <Typography noWrap sx={{ fontSize: 13, color: 'text.secondary' }}>
              {countryDisplay}
            </Typography>
          )}
          {description && (
            <Typography sx={{
              fontSize: 12.5, lineHeight: 1.5, color: 'text.secondary',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {description}
            </Typography>
          )}

          {/* Footer */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 'auto', pt: 1.25 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              {members && members.length > 0 && (
                <AvatarGroup
                  max={4}
                  sx={{
                    '& .MuiAvatar-root': {
                      width: 24, height: 24, fontSize: 11, fontWeight: 700,
                      border: `1.5px solid ${theme.palette.background.paper}`,
                    },
                  }}
                >
                  {members.map((m, i) => (
                    <Avatar
                      key={m.id ?? i}
                      src={m.profilePic || undefined}
                      alt={m.name}
                      sx={{ bgcolor: avatarColor(m.id || m.name || String(i)) }}
                    >
                      {m.name?.charAt(0).toUpperCase() || '?'}
                    </Avatar>
                  ))}
                </AvatarGroup>
              )}
              {edited && (
                <Typography noWrap sx={{ fontSize: 12, color: 'text.disabled' }}>{edited}</Typography>
              )}
            </Box>

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
        </Box>
      </Box>
    </motion.div>
  );
};

export default TripCard;
