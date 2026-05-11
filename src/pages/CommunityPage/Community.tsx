import React from 'react';
import {
  Box, Typography, Chip, CircularProgress, Alert, Avatar,
  InputBase, useTheme, useMediaQuery, Skeleton, Tooltip,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import TopBar from '../PageLayout/CommonLayouts/TopBar';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { apiServices } from '../../services/APIs/apiServices';
import SearchIcon from '@mui/icons-material/Search';
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import NightsStayRoundedIcon from '@mui/icons-material/NightsStayRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import WhatshotRoundedIcon from '@mui/icons-material/WhatshotRounded';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LandscapeRoundedIcon from '@mui/icons-material/LandscapeRounded';
import LocationCityRoundedIcon from '@mui/icons-material/LocationCityRounded';
import SpaRoundedIcon from '@mui/icons-material/SpaRounded';
import TheaterComedyRoundedIcon from '@mui/icons-material/TheaterComedyRounded';
import DiamondRoundedIcon from '@mui/icons-material/DiamondRounded';
import TravelExploreRoundedIcon from '@mui/icons-material/TravelExploreRounded';
import { fetchUnsplashImage } from '../../services/unsplashService';

// ─── helpers ─────────────────────────────────────────────────────────────────

const VIBE_META: Record<string, { label: string; icon: React.ReactNode; gradient: string; tag: string }> = {
  adventure: { label: 'Adventure', icon: <LandscapeRoundedIcon sx={{ fontSize: 14 }} />, gradient: 'linear-gradient(135deg,#059669,#047857)', tag: '#10B981' },
  culture:   { label: 'Culture',   icon: <TheaterComedyRoundedIcon sx={{ fontSize: 14 }} />, gradient: 'linear-gradient(135deg,#7C3AED,#5B21B6)', tag: '#8B5CF6' },
  romantic:  { label: 'Party',     icon: <WhatshotRoundedIcon sx={{ fontSize: 14 }} />, gradient: 'linear-gradient(135deg,#FF385C,#D91A50)', tag: '#FF385C' },
  luxury:    { label: 'Slow Travel', icon: <DiamondRoundedIcon sx={{ fontSize: 14 }} />, gradient: 'linear-gradient(135deg,#D97706,#B45309)', tag: '#F59E0B' },
  spiritual: { label: 'Spiritual', icon: <SpaRoundedIcon sx={{ fontSize: 14 }} />, gradient: 'linear-gradient(135deg,#CA8A04,#A16207)', tag: '#CA8A04' },
  urban:     { label: 'Urban',     icon: <LocationCityRoundedIcon sx={{ fontSize: 14 }} />, gradient: 'linear-gradient(135deg,#2563EB,#1D4ED8)', tag: '#3B82F6' },
  scenic:    { label: 'Scenic',    icon: <LandscapeRoundedIcon sx={{ fontSize: 14 }} />, gradient: 'linear-gradient(135deg,#10B981,#059669)', tag: '#10B981' },
};

const CATEGORIES = [
  { id: 'all',       label: 'All Trips',  icon: <ExploreOutlinedIcon sx={{ fontSize: 15 }} /> },
  { id: 'adventure', label: 'Adventure',  icon: <LandscapeRoundedIcon sx={{ fontSize: 15 }} /> },
  { id: 'culture',   label: 'Culture',    icon: <TheaterComedyRoundedIcon sx={{ fontSize: 15 }} /> },
  { id: 'urban',     label: 'Urban',      icon: <LocationCityRoundedIcon sx={{ fontSize: 15 }} /> },
  { id: 'scenic',    label: 'Scenic',     icon: <LandscapeRoundedIcon sx={{ fontSize: 15 }} /> },
  { id: 'spiritual', label: 'Spiritual',  icon: <SpaRoundedIcon sx={{ fontSize: 15 }} /> },
  { id: 'luxury',    label: 'Slow Travel',icon: <DiamondRoundedIcon sx={{ fontSize: 15 }} /> },
  { id: 'romantic',  label: 'Party',      icon: <WhatshotRoundedIcon sx={{ fontSize: 15 }} /> },
];

// ─── trip card ────────────────────────────────────────────────────────────────
interface TripCardProps { trip: any; onClick: () => void; }

const CommunityTripCard: React.FC<TripCardProps> = ({ trip, onClick }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [photo, setPhoto] = React.useState<string | null>(trip.photoUrl || null);
  const [liked, setLiked] = React.useState(false);
  const [likeCount, setLikeCount] = React.useState(typeof trip.likes === 'number' ? trip.likes : 0);
  const [imgFailed, setImgFailed] = React.useState(false);

  React.useEffect(() => {
    if (trip.photoUrl && !imgFailed) { setPhoto(trip.photoUrl); return; }
    const query = (trip.countries?.[0] || trip.name || 'travel').split(',')[0];
    let cancelled = false;
    fetchUnsplashImage(query).then(url => { if (!cancelled && url) setPhoto(url); });
    return () => { cancelled = true; };
  }, [trip.photoUrl, trip.countries, trip.name, imgFailed]);

  const vibe = VIBE_META[trip.vibe?.toLowerCase?.()] || null;
  const nights = typeof trip.totalNights === 'number' ? trip.totalNights
    : typeof trip.targetNights === 'number' ? trip.targetNights : null;
  const ownerName = trip.ownerName || trip.OwnerName || (trip.owner ? `${trip.owner.fname || ''} ${trip.owner.lname || ''}`.trim() : null) || 'Explorer';
  const ownerAvatar = trip.ownerAvatar || trip.OwnerAvatar || trip.owner?.avatar || trip.owner?.profilepicture || null;
  const countries: string[] = Array.isArray(trip.countries) ? trip.countries : [];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      whileHover={{ y: -6, transition: { type: 'spring', stiffness: 340, damping: 22 } }}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <Box sx={{
        borderRadius: '20px', overflow: 'hidden',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`,
        background: isDark ? 'rgba(18,22,28,0.95)' : '#ffffff',
        boxShadow: isDark
          ? '0 4px 24px rgba(0,0,0,0.45)'
          : '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
        transition: 'box-shadow .25s ease, transform .25s ease',
        '&:hover': {
          boxShadow: isDark
            ? '0 12px 40px rgba(0,0,0,0.6)'
            : '0 12px 40px rgba(0,0,0,0.14)',
        },
      }}>
        {/* Cover image */}
        <Box sx={{ position: 'relative', height: 190, overflow: 'hidden', bgcolor: isDark ? '#1a1f27' : '#f0f2f5', flexShrink: 0 }}>
          {photo ? (
            <Box
              component='img' src={photo} alt={trip.name}
              onError={() => setImgFailed(true)}
              sx={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .5s ease', '&:hover': { transform: 'scale(1.06)' } }}
            />
          ) : (
            <Box sx={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1a2a3a 0%,#0f1922 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TravelExploreRoundedIcon sx={{ fontSize: 48, opacity: 0.2, color: '#fff' }} />
            </Box>
          )}
          {/* gradient overlay */}
          <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.72) 0%,rgba(0,0,0,0.12) 55%,transparent 100%)', pointerEvents: 'none' }} />
          {/* vibe chip */}
          {vibe && (
            <Box sx={{
              position: 'absolute', top: 12, left: 12,
              display: 'flex', alignItems: 'center', gap: .5,
              px: 1.2, py: .4, borderRadius: '50px',
              background: vibe.gradient,
              boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
              color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
            }}>
              {vibe.icon}{vibe.label}
            </Box>
          )}
          {/* nights */}
          {nights !== null && (
            <Box sx={{
              position: 'absolute', top: 12, right: 12,
              display: 'flex', alignItems: 'center', gap: .4,
              px: 1.1, py: .35, borderRadius: '50px',
              background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
              color: '#fff', fontSize: 11, fontWeight: 700,
              border: '1px solid rgba(255,255,255,0.15)',
            }}>
              <NightsStayRoundedIcon sx={{ fontSize: 12 }} />{nights}n
            </Box>
          )}
          {/* title over image */}
          <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, px: 2, pb: 1.5 }}>
            <Typography sx={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 800, fontStyle: 'italic',
              fontSize: { xs: '1rem', sm: '1.1rem' },
              color: '#fff', lineHeight: 1.2,
              textShadow: '0 2px 12px rgba(0,0,0,0.6)',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {trip.name || 'Untitled Trip'}
            </Typography>
          </Box>
        </Box>

        {/* Card body */}
        <Box sx={{ px: 2, pt: 1.5, pb: 2, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
          {/* Countries */}
          {countries.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: .5 }}>
              {countries.slice(0, 3).map(c => (
                <Box key={c} sx={{
                  display: 'flex', alignItems: 'center', gap: .35,
                  px: .9, py: .25, borderRadius: '50px', fontSize: 11, fontWeight: 600,
                  background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                  color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.65)',
                }}>
                  <PublicRoundedIcon sx={{ fontSize: 10.5 }} />{c}
                </Box>
              ))}
              {countries.length > 3 && (
                <Box sx={{ px: .9, py: .25, borderRadius: '50px', fontSize: 11, fontWeight: 600, color: 'text.disabled', background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                  +{countries.length - 3}
                </Box>
              )}
            </Box>
          )}

          {/* Description */}
          {trip.description && (
            <Typography sx={{
              fontSize: 12.5, color: 'text.secondary', lineHeight: 1.55,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {trip.description}
            </Typography>
          )}

          {/* Footer row */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: .5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: .75 }}>
              <Avatar
                src={ownerAvatar || undefined}
                sx={{ width: 24, height: 24, fontSize: 11, fontWeight: 700, bgcolor: '#FF385C' }}
              >
                {ownerName?.charAt(0).toUpperCase()}
              </Avatar>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ownerName}
              </Typography>
            </Box>
            <Box
              onClick={e => { e.stopPropagation(); setLiked(v => !v); setLikeCount(v => liked ? v - 1 : v + 1); }}
              sx={{
                display: 'flex', alignItems: 'center', gap: .4,
                px: 1, py: .35, borderRadius: '50px', cursor: 'pointer',
                fontSize: 11.5, fontWeight: 700,
                color: liked ? '#FF385C' : 'text.disabled',
                background: liked ? 'rgba(255,56,92,0.08)' : 'transparent',
                transition: 'all .2s',
                '&:hover': { background: 'rgba(255,56,92,0.08)', color: '#FF385C' },
              }}
            >
              <FavoriteRoundedIcon sx={{ fontSize: 13 }} />{likeCount}
            </Box>
          </Box>
        </Box>
      </Box>
    </motion.div>
  );
};

// ─── skeleton cards ───────────────────────────────────────────────────────────
const SkeletonCard = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box sx={{ borderRadius: '20px', overflow: 'hidden', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}` }}>
      <Skeleton variant='rectangular' height={190} animation='wave' />
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
        <Skeleton variant='text' width='75%' height={18} animation='wave' />
        <Skeleton variant='text' width='55%' height={14} animation='wave' />
        <Box sx={{ display: 'flex', gap: .5 }}>
          <Skeleton variant='rounded' width={60} height={20} animation='wave' sx={{ borderRadius: '50px' }} />
          <Skeleton variant='rounded' width={60} height={20} animation='wave' sx={{ borderRadius: '50px' }} />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: .5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: .75 }}>
            <Skeleton variant='circular' width={24} height={24} animation='wave' />
            <Skeleton variant='text' width={80} height={14} animation='wave' />
          </Box>
          <Skeleton variant='rounded' width={40} height={22} animation='wave' sx={{ borderRadius: '50px' }} />
        </Box>
      </Box>
    </Box>
  );
};

// ─── main component ───────────────────────────────────────────────────────────
const Community: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { token } = useAuthToken();
  const navigate = useNavigate();

  const [trips, setTrips] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeCategory, setActiveCategory] = React.useState('all');
  const [search, setSearch] = React.useState('');

  // Fetch published trips
  React.useEffect(() => {
    let active = true;
    setLoading(true);
    const fetchToken = token || localStorage.getItem('accessToken') || '';
    if (!fetchToken) { setLoading(false); setError('Please sign in to explore community trips.'); return; }
    (async () => {
      try {
        const resp = await apiServices.getPublishedTrips(fetchToken);
        if (!active) return;
        const data = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp?.data?.trips) ? resp.data.trips : []);
        setTrips(data);
      } catch {
        if (!active) return;
        // Fallback: try public endpoint
        try {
          const resp2 = await apiServices.getPublicTrips(fetchToken);
          if (!active) return;
          const data2 = Array.isArray(resp2?.data) ? resp2.data : [];
          setTrips(data2);
        } catch {
          if (!active) return;
          setError('Unable to load community trips. Please try again.');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [token]);

  // Filter logic
  const filtered = React.useMemo(() => {
    let list = trips;
    if (activeCategory !== 'all') {
      list = list.filter(t => (t.vibe || '').toLowerCase() === activeCategory);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(t =>
        (t.name || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (Array.isArray(t.countries) && t.countries.some((c: string) => c.toLowerCase().includes(q)))
      );
    }
    return list;
  }, [trips, activeCategory, search]);

  const handleTripClick = (trip: any) => {
    const tripId = trip.id || trip.Id;
    if (tripId) navigate(`/trip/${tripId}`, { state: { trip } });
  };

  // Stats
  const totalCountries = React.useMemo(() => {
    const set = new Set<string>();
    trips.forEach(t => (t.countries || []).forEach((c: string) => set.add(c)));
    return set.size;
  }, [trips]);

  const bg = isDark ? '#0a0c0f' : '#f5f7fa';
  const cardBg = isDark ? 'rgba(18,22,28,0.80)' : 'rgba(255,255,255,0.85)';
  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: bg, display: 'flex', flexDirection: 'column' }}>
      <TopBar />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <Box sx={{
        position: 'relative', overflow: 'hidden',
        pt: { xs: 5, md: 7 }, pb: { xs: 4, md: 6 },
        px: { xs: 2, sm: 4, md: 8 },
      }}>
        {/* ambient glows */}
        <Box sx={{ position: 'absolute', top: -80, left: '15%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,56,92,0.18) 0%,transparent 70%)', pointerEvents: 'none', filter: 'blur(60px)' }} />
        <Box sx={{ position: 'absolute', top: -60, right: '10%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.15) 0%,transparent 70%)', pointerEvents: 'none', filter: 'blur(50px)' }} />

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1.5 }}>
            <AutoAwesomeIcon sx={{ fontSize: 18, color: '#FF385C' }} />
            <Typography sx={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FF385C' }}>Community Adventures</Typography>
          </Box>

          <Typography sx={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: 900, fontStyle: 'italic',
            fontSize: { xs: '2rem', sm: '2.8rem', md: '3.5rem' },
            lineHeight: 1.1,
            background: isDark
              ? 'linear-gradient(135deg,#ffffff 0%,rgba(255,255,255,0.7) 100%)'
              : 'linear-gradient(135deg,#0f172a 0%,#334155 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            mb: 1.5,
          }}>
            Explore Journeys<br />from Around the World
          </Typography>

          <Typography sx={{ fontSize: { xs: 14, md: 16 }, color: 'text.secondary', maxWidth: 520, lineHeight: 1.65, mb: 3.5 }}>
            Discover real trip plans created by Tripician travelers — from weekend escapes to epic multi-month adventures.
          </Typography>

          {/* Stats row */}
          {!loading && !error && trips.length > 0 && (
            <Box sx={{ display: 'flex', gap: { xs: 3, sm: 5 }, mb: 4, flexWrap: 'wrap' }}>
              {[
                { value: trips.length, label: 'Published Trips' },
                { value: totalCountries, label: 'Countries Covered' },
                { value: trips.filter(t => t.vibe).length, label: 'Vibes Shared' },
              ].map(s => (
                <Box key={s.label}>
                  <Typography sx={{ fontSize: { xs: '1.6rem', md: '2rem' }, fontWeight: 900, color: '#FF385C', lineHeight: 1 }}>{s.value}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.disabled', fontWeight: 600, mt: .25 }}>{s.label}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </motion.div>

        {/* Search bar */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            maxWidth: 560,
            px: 2, py: 1.2, borderRadius: '50px',
            background: cardBg,
            border: `1.5px solid ${borderColor}`,
            backdropFilter: 'blur(16px)',
            boxShadow: isDark ? '0 4px 32px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.08)',
            transition: 'border-color .2s, box-shadow .2s',
            '&:focus-within': { borderColor: '#FF385C', boxShadow: isDark ? '0 0 0 3px rgba(255,56,92,0.18)' : '0 0 0 3px rgba(255,56,92,0.12)' },
          }}>
            <SearchIcon sx={{ fontSize: 20, color: 'text.disabled', flexShrink: 0 }} />
            <InputBase
              fullWidth
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Search trips, destinations, countries…'
              sx={{ fontSize: 14.5, fontWeight: 500, '& input::placeholder': { color: 'text.disabled', opacity: 1 } }}
            />
          </Box>
        </motion.div>
      </Box>

      {/* ── Category tabs ──────────────────────────────────────────────────────── */}
      <Box sx={{
        px: { xs: 2, sm: 4, md: 8 }, pb: 1.5, pt: .5,
        display: 'flex', gap: 1, overflowX: 'auto',
        '::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none',
        flexShrink: 0,
      }}>
        {CATEGORIES.map(cat => {
          const active = activeCategory === cat.id;
          return (
            <Tooltip key={cat.id} title={cat.label} enterDelay={600} placement='bottom'>
              <Chip
                icon={React.cloneElement(cat.icon as React.ReactElement, {
                  sx: { fontSize: 15, color: active ? '#fff !important' : 'text.secondary' },
                })}
                label={isMobile ? '' : cat.label}
                onClick={() => setActiveCategory(cat.id)}
                sx={{
                  fontWeight: 700, fontSize: 13, height: 38,
                  px: isMobile ? .5 : 1,
                  flexShrink: 0,
                  background: active
                    ? 'linear-gradient(135deg,#FF385C,#E31C5F)'
                    : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  color: active ? '#fff' : 'text.secondary',
                  border: `1.5px solid ${active ? 'transparent' : borderColor}`,
                  boxShadow: active ? '0 4px 16px rgba(255,56,92,0.35)' : 'none',
                  transition: 'all .2s',
                  '&:hover': { background: active ? 'linear-gradient(135deg,#e02d50,#c91855)' : isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)' },
                  '& .MuiChip-label': { px: isMobile ? .25 : 1 },
                  '& .MuiChip-icon': { ml: isMobile ? .5 : 1 },
                }}
              />
            </Tooltip>
          );
        })}
      </Box>

      {/* ── Content ────────────────────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, px: { xs: 2, sm: 4, md: 8 }, pb: 8, pt: 2 }}>

        {/* Loading skeletons */}
        {loading && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(4,1fr)' }, gap: { xs: 2, md: 2.5 } }}>
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </Box>
        )}

        {/* Error */}
        {!loading && error && (
          <Alert severity='info' variant='outlined' sx={{ maxWidth: 480, mx: 'auto', mt: 4, borderRadius: 3 }}>
            {error}
          </Alert>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 12, gap: 2 }}>
            <ExploreOutlinedIcon sx={{ fontSize: 56, opacity: 0.18, color: 'text.primary' }} />
            <Typography variant='h6' sx={{ fontWeight: 700, opacity: 0.5 }}>No trips found</Typography>
            <Typography variant='body2' sx={{ opacity: 0.45, textAlign: 'center', maxWidth: 340 }}>
              {search ? 'Try different search terms or clear the filter.' : 'No published trips in this category yet.'}
            </Typography>
          </Box>
        )}

        {/* Trip grid */}
        {!loading && !error && filtered.length > 0 && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.disabled' }}>
                {filtered.length} trip{filtered.length !== 1 ? 's' : ''} {activeCategory !== 'all' ? `in ${CATEGORIES.find(c => c.id === activeCategory)?.label}` : 'found'}
              </Typography>
            </Box>
            <AnimatePresence mode='popLayout'>
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(4,1fr)' },
                gap: { xs: 2, md: 2.5 },
              }}>
                {filtered.map((trip, i) => (
                  <motion.div key={trip.id || i} layout>
                    <CommunityTripCard trip={trip} onClick={() => handleTripClick(trip)} />
                  </motion.div>
                ))}
              </Box>
            </AnimatePresence>
          </>
        )}
      </Box>
    </Box>
  );
};

export default Community;
