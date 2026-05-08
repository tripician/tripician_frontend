/**
 * TripHeader — premium glassmorphism hero banner
 * Shows cover image, editable title, date range, nights ring, countries row.
 */
import React from 'react';
import { Box, Typography, IconButton, Chip, Tooltip, InputBase, useTheme } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import NightsStayIcon from '@mui/icons-material/NightsStay';
import PublicIcon from '@mui/icons-material/Public';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';

const PRIVACY_ICON: Record<string, React.ReactNode> = {
  Private: <LockOutlinedIcon sx={{ fontSize: 12 }} />,
  'Trip Members': <PeopleOutlineIcon sx={{ fontSize: 12 }} />,
  Everyone: <PublicIcon sx={{ fontSize: 12 }} />,
};

const FALLBACK_GRADIENT = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)';

interface TripHeaderProps {
  title: string;
  editingTitle: boolean;
  isDraft: boolean;
  isExternalNonOwner?: boolean;
  bannerUrl?: string;
  tripStartDate: string | null;
  tripEndDate: string | null;
  totalNights: number;
  targetNights: number;
  countries: string[];
  privacy: string;
  onEditTitle: () => void;
  onCommitTitle: () => void;
  onTitleChange: (v: string) => void;
  onSettingsClick: () => void;
}

const formatDateRange = (start: string | null, end: string | null): string => {
  if (!start) return 'Dates not set';
  const fmt = (iso: string) => {
    try {
      return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch { return iso; }
  };
  if (!end || start === end) return fmt(start);
  return `${fmt(start)} — ${fmt(end)}`;
};

const TripHeader: React.FC<TripHeaderProps> = ({
  title, editingTitle, isDraft, isExternalNonOwner, bannerUrl,
  tripStartDate, tripEndDate, totalNights, targetNights,
  countries, privacy,
  onEditTitle, onCommitTitle, onTitleChange, onSettingsClick,
}) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const hasBanner = Boolean(bannerUrl);
  const nightsPct = targetNights ? Math.min(100, Math.round((totalNights / targetNights) * 100)) : 0;
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editingTitle) inputRef.current?.select();
  }, [editingTitle]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <Box
        sx={{
          position: 'relative',
          mx: { xs: 0, md: 2.5 },
          mt: 2,
          mb: 0,
          borderRadius: '20px',
          overflow: 'hidden',
          minHeight: { xs: 180, md: 230 },
          background: hasBanner ? undefined : FALLBACK_GRADIENT,
          boxShadow: isLight
            ? '0 8px 40px rgba(0,0,0,0.14)'
            : '0 8px 40px rgba(0,0,0,0.55)',
        }}
      >
        {/* Cover image */}
        {hasBanner && (
          <Box
            component="img"
            src={bannerUrl}
            alt="Trip cover"
            sx={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 40%',
              transition: 'transform 8s ease',
              '&:hover': { transform: 'scale(1.04)' },
            }}
          />
        )}

        {/* Gradient overlay — always present for legibility */}
        <Box sx={{
          position: 'absolute', inset: 0,
          background: hasBanner
            ? 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.28) 55%, rgba(0,0,0,0.08) 100%)'
            : 'linear-gradient(135deg, rgba(255,56,92,0.18) 0%, rgba(217,26,80,0.06) 100%)',
        }} />

        {/* Subtle dot noise overlay */}
        <Box sx={{
          position: 'absolute', inset: 0, opacity: 0.025,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
          pointerEvents: 'none',
        }} />

        {/* Content */}
        <Box sx={{
          position: 'relative', zIndex: 1,
          height: '100%', minHeight: { xs: 180, md: 230 },
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between',
          p: { xs: 2, md: 3 },
        }}>
          {/* Top row: draft badge + settings */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip
                size="small"
                label={isDraft ? 'Draft' : 'Published'}
                sx={{
                  fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
                  textTransform: 'uppercase',
                  bgcolor: isDraft ? 'rgba(255,255,255,0.18)' : 'rgba(34,197,94,0.78)',
                  color: '#fff',
                  backdropFilter: 'blur(6px)',
                  border: '1px solid rgba(255,255,255,0.22)',
                }}
              />
              {privacy && (
                <Chip
                  size="small"
                  icon={<Box sx={{ color: 'rgba(255,255,255,0.8)', display: 'flex', pl: 0.5 }}>{PRIVACY_ICON[privacy]}</Box>}
                  label={privacy}
                  sx={{
                    fontSize: 10, fontWeight: 600,
                    bgcolor: 'rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.88)',
                    backdropFilter: 'blur(6px)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    '& .MuiChip-icon': { ml: 0.5, color: 'inherit' },
                  }}
                />
              )}
            </Box>
            {!isExternalNonOwner && (
              <Tooltip title="Trip settings">
                <IconButton
                  size="small"
                  onClick={onSettingsClick}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.22)',
                    color: '#fff',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                  }}
                >
                  <EditIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {/* Bottom: title + meta */}
          <Box>
            {/* Title */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
              <AnimatePresence mode="wait">
                {editingTitle ? (
                  <motion.div
                    key="editing"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}
                  >
                    <InputBase
                      inputRef={inputRef}
                      value={title}
                      onChange={e => onTitleChange(e.target.value)}
                      onBlur={onCommitTitle}
                      onKeyDown={e => {
                        if (e.key === 'Enter') onCommitTitle();
                        if (e.key === 'Escape') onCommitTitle();
                      }}
                      sx={{
                        flex: 1,
                        fontSize: { xs: 22, md: 28 },
                        fontWeight: 800,
                        color: '#fff',
                        fontFamily: "'Inter', system-ui, sans-serif",
                        letterSpacing: -0.5,
                        '& input': {
                          padding: '4px 10px',
                          borderRadius: '10px',
                          background: 'rgba(255,255,255,0.14)',
                          backdropFilter: 'blur(8px)',
                          border: '1px solid rgba(255,255,255,0.35)',
                          color: '#fff',
                        },
                      }}
                    />
                    <IconButton size="small" onClick={onCommitTitle} sx={{ bgcolor: '#FF385C', color: '#fff', '&:hover': { bgcolor: '#D91A50' } }}>
                      <CheckIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </motion.div>
                ) : (
                  <motion.div
                    key="display"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isExternalNonOwner ? 'default' : 'text' }}
                    onClick={() => { if (!isExternalNonOwner) onEditTitle(); }}
                  >
                    <Typography
                      sx={{
                        fontSize: { xs: 22, md: 30 },
                        fontWeight: 800,
                        color: '#fff',
                        fontFamily: "'Inter', system-ui, sans-serif",
                        letterSpacing: -0.5,
                        lineHeight: 1.15,
                        textShadow: '0 2px 12px rgba(0,0,0,0.35)',
                        userSelect: 'none',
                      }}
                    >
                      {title}
                    </Typography>
                    {!isExternalNonOwner && (
                      <EditIcon sx={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', transition: 'color .2s', '&:hover': { color: '#fff' } }} />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </Box>

            {/* Meta row */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, alignItems: 'center' }}>
              {/* Dates */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6,
                bgcolor: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '20px', px: 1.25, py: 0.4 }}>
                <CalendarTodayIcon sx={{ fontSize: 11, color: 'rgba(255,255,255,0.72)' }} />
                <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.88)', fontFamily: "'Inter', sans-serif" }}>
                  {formatDateRange(tripStartDate, tripEndDate)}
                </Typography>
              </Box>

              {/* Nights */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6,
                bgcolor: 'rgba(255,56,92,0.25)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,56,92,0.4)',
                borderRadius: '20px', px: 1.25, py: 0.4 }}>
                <NightsStayIcon sx={{ fontSize: 11, color: '#FF8A9F' }} />
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#fff', fontFamily: "'Inter', sans-serif" }}>
                  {totalNights}/{targetNights} nights
                </Typography>
                {/* Mini progress bar */}
                <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)', overflow: 'hidden', ml: 0.5 }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${nightsPct}%` }}
                    transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                    style={{ height: '100%', background: 'linear-gradient(90deg,#FF385C,#FF8A9F)', borderRadius: 2 }}
                  />
                </Box>
              </Box>

              {/* Countries */}
              {countries.slice(0, 4).map(c => (
                <Box key={c} sx={{ display: 'flex', alignItems: 'center', gap: 0.5,
                  bgcolor: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(6px)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  borderRadius: '20px', px: 1, py: 0.35 }}>
                  <PublicIcon sx={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }} />
                  <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.85)', fontFamily: "'Inter', sans-serif" }}>
                    {c}
                  </Typography>
                </Box>
              ))}
              {countries.length > 4 && (
                <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontFamily: "'Inter', sans-serif" }}>
                  +{countries.length - 4} more
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </motion.div>
  );
};

export default TripHeader;
