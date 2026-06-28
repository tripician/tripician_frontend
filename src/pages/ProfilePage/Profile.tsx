import React, { useEffect, useState, useMemo } from 'react';
import {
  Box, Typography, CircularProgress, Alert, Button, Container,
  Avatar, Divider, Chip, Skeleton, useTheme,
  IconButton, Tooltip,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import TopBar from '../PageLayout/CommonLayouts/TopBar';
import type { RootState, AppDispatch } from '../../store';
import { fetchUserProfile } from '../../store/userSlice';
import { apiServices } from '../../services/APIs/apiServices';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { useAuth0 } from '@auth0/auth0-react';
import { fetchUnsplashImage } from '../../services/unsplashService';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import CakeRoundedIcon from '@mui/icons-material/CakeRounded';
import WcRoundedIcon from '@mui/icons-material/WcRounded';
import NightsStayRoundedIcon from '@mui/icons-material/NightsStayRounded';
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded';
import TravelExploreRoundedIcon from '@mui/icons-material/TravelExploreRounded';
import InstagramIcon from '@mui/icons-material/Instagram';
import TwitterIcon from '@mui/icons-material/Twitter';
import FacebookIcon from '@mui/icons-material/Facebook';
import LanguageIcon from '@mui/icons-material/Language';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';

import StarRoundedIcon from '@mui/icons-material/StarRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import ArchiveRoundedIcon from '@mui/icons-material/ArchiveRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';

// 
// Default banner fetched once from Unsplash (cached in module scope)
// 
let _defaultBanner: string | null = null;
const DEFAULT_BANNER_QUERIES = ['mountains aerial travel', 'aerial landscape travel', 'travel adventure nature'];

async function loadDefaultBanner(): Promise<string | null> {
  if (_defaultBanner) return _defaultBanner;
  for (const q of DEFAULT_BANNER_QUERIES) {
    const url = await fetchUnsplashImage(q);
    if (url) { _defaultBanner = url; return url; }
  }
  return null;
}

// 
// TRIP CARD
// 
const ProfileTripCard: React.FC<{ trip: any; index: number; onClick: () => void }> = ({ trip, index, onClick }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [photo, setPhoto] = useState<string | null>(trip.photoUrl || null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (trip.photoUrl) { setPhoto(trip.photoUrl); return; }
    const q = (Array.isArray(trip.countries) && trip.countries[0]
      ? trip.countries[0] : trip.name || 'travel').split(',')[0];
    let cancelled = false;
    fetchUnsplashImage(q).then(url => { if (!cancelled && url) setPhoto(url); });
    return () => { cancelled = true; };
  }, [trip.photoUrl, trip.countries, trip.name]);

  const nights = trip.totalNights ?? trip.targetNights ?? null;
  const countries: string[] = Array.isArray(trip.countries) ? trip.countries : [];
  const isPublished = trip.published === true || (trip.status || '').toUpperCase() === 'PUBLISHED';
  const isGroup = (trip.travelType || trip.tripType || '').toLowerCase().includes('group');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 300, damping: 24 }}
      whileHover={{ y: -6, scale: 1.012 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <Box sx={{
        borderRadius: '18px', overflow: 'hidden',
        border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`,
        background: isDark ? 'rgba(18,23,30,0.98)' : '#fff',
        boxShadow: hovered
          ? isDark ? '0 16px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,56,92,0.18)' : '0 16px 40px rgba(0,0,0,0.13), 0 0 0 1px rgba(255,56,92,0.12)'
          : isDark ? '0 2px 12px rgba(0,0,0,0.35)' : '0 2px 12px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.28s ease',
      }}>
        {/* Cover */}
        <Box sx={{ position: 'relative', height: 155, overflow: 'hidden' }}>
          {photo ? (
            <Box component='img' src={photo} alt={trip.name} sx={{
              width: '100%', height: '100%', objectFit: 'cover',
              transform: hovered ? 'scale(1.07)' : 'scale(1)',
              transition: 'transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94)',
            }} />
          ) : (
            <Box sx={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TravelExploreRoundedIcon sx={{ fontSize: 36, color: 'rgba(255,255,255,0.15)' }} />
            </Box>
          )}
          <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.75) 0%,transparent 55%)', pointerEvents: 'none' }} />

          {/* Badges */}
          <Box sx={{ position: 'absolute', top: 9, left: 10, right: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {isPublished && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35, px: 1, py: 0.3, borderRadius: '50px', background: 'linear-gradient(135deg,#FF385C,#E31C5F)', color: '#fff', fontSize: 10, fontWeight: 800, boxShadow: '0 2px 10px rgba(255,56,92,0.5)' }}>
                  <StarRoundedIcon sx={{ fontSize: 10 }} />Shared
                </Box>
              )}
              {isGroup && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35, px: 1, py: 0.3, borderRadius: '50px', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', color: '#fff', fontSize: 10, fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)' }}>
                  <PeopleRoundedIcon sx={{ fontSize: 10 }} />Group
                </Box>
              )}
            </Box>
            {nights !== null && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35, px: 1, py: 0.3, borderRadius: '50px', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', color: '#fff', fontSize: 10, fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)' }}>
                <NightsStayRoundedIcon sx={{ fontSize: 10 }} />{nights}n
              </Box>
            )}
          </Box>

          {/* Title */}
          <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, px: 1.75, pb: 1.5 }}>
            <Typography sx={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, fontStyle: 'italic', fontSize: '0.95rem', color: '#fff', lineHeight: 1.25, textShadow: '0 2px 14px rgba(0,0,0,0.7)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {trip.name || 'Untitled Journey'}
            </Typography>
          </Box>
        </Box>

        {/* Body */}
        <Box sx={{ px: 1.75, pt: 1.25, pb: 1.75, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {countries.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
              {countries.slice(0, 2).map(c => (
                <Box key={c} sx={{ display: 'flex', alignItems: 'center', gap: 0.3, px: 0.75, py: 0.2, borderRadius: '50px', fontSize: 10, fontWeight: 600, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)' }}>
                  <LocationOnRoundedIcon sx={{ fontSize: 9 }} />{c}
                </Box>
              ))}
              {countries.length > 2 && <Box sx={{ px: 0.75, py: 0.2, borderRadius: '50px', fontSize: 10, color: 'text.disabled' }}>+{countries.length - 2}</Box>}
            </Box>
          )}

          {/* Hover CTA */}
          <Box sx={{ height: hovered ? 30 : 0, overflow: 'hidden', transition: 'height 0.25s ease', mt: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 30, borderRadius: '10px', background: 'linear-gradient(135deg,#FF385C,#E31C5F)', color: '#fff', fontSize: 11.5, fontWeight: 800, letterSpacing: '0.04em', boxShadow: '0 3px 12px rgba(255,56,92,0.4)' }}>
              Open Journey &rarr;
            </Box>
          </Box>
        </Box>
      </Box>
    </motion.div>
  );
};

// 
// STAT PILL
// 
const StatPill: React.FC<{ value: number | string; label: string; icon: React.ReactNode; accent?: string }> = ({ value, label, icon, accent = '#FF385C' }) => {
  const isDark = useTheme().palette.mode === 'dark';
  return (
    <motion.div whileHover={{ scale: 1.05, y: -1 }} transition={{ type: 'spring', stiffness: 400, damping: 22 }}>
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1,
        px: { xs: 1.5, sm: 2 }, py: { xs: 1, sm: 1.25 },
        borderRadius: '16px',
        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(14px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
        boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.25)' : '0 2px 12px rgba(0,0,0,0.05)',
        cursor: 'default', flexShrink: 0,
      }}>
        <Box sx={{ color: accent, '& svg': { fontSize: { xs: 16, sm: 18 } } }}>{icon}</Box>
        <Box>
          <Typography sx={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: { xs: '1.1rem', sm: '1.25rem' }, color: 'text.primary', lineHeight: 1 }}>{value}</Typography>
          <Typography sx={{ fontSize: { xs: 9, sm: 9.5 }, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'text.disabled', lineHeight: 1, mt: 0.2 }}>{label}</Typography>
        </Box>
      </Box>
    </motion.div>
  );
};

// 
// DETAIL ROW
// 
const DetailRow: React.FC<{ icon: React.ReactNode; label: string; value?: string | null }> = ({ icon, label, value }) => {
  if (!value?.trim()) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, py: 0.9 }}>
      <Box sx={{ width: 30, height: 30, borderRadius: '9px', flexShrink: 0, background: 'linear-gradient(135deg,rgba(255,56,92,0.12),rgba(255,56,92,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF385C' }}>
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'text.disabled', lineHeight: 1, mb: 0.2 }}>{label}</Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'text.primary', wordBreak: 'break-word', lineHeight: 1.35 }}>{value}</Typography>
      </Box>
    </Box>
  );
};

// 
// PILL TABS
// 
const PillTabs: React.FC<{ tabs: { label: string; count: number }[]; active: number; onChange: (i: number) => void }> = ({ tabs, active, onChange }) => {
  const isDark = useTheme().palette.mode === 'dark';
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', p: 0.5, borderRadius: '50px', gap: 0.4, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}` }}>
      {tabs.map((tab, i) => (
        <Box key={tab.label} onClick={() => onChange(i)} sx={{
          px: { xs: 1.4, sm: 2 }, py: { xs: 0.65, sm: 0.8 }, borderRadius: '50px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 0.6,
          background: active === i ? 'linear-gradient(135deg,#FF385C,#E31C5F)' : 'transparent',
          color: active === i ? '#fff' : 'text.secondary',
          fontSize: { xs: 11.5, sm: 12.5 }, fontWeight: 700, fontFamily: "'Inter',sans-serif",
          boxShadow: active === i ? '0 3px 14px rgba(255,56,92,0.35)' : 'none',
          transition: 'all 0.2s ease', userSelect: 'none',
          '&:hover': { background: active !== i ? (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)') : undefined },
        }}>
          {tab.label}
          <Box sx={{ px: 0.65, borderRadius: '50px', fontSize: 10, fontWeight: 900, background: active === i ? 'rgba(255,255,255,0.22)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'), color: active === i ? '#fff' : 'text.disabled', lineHeight: '17px', minWidth: 20, textAlign: 'center' }}>
            {tab.count}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

// 
// SKELETON
// 
const SkeletonTripCard = () => {
  const isDark = useTheme().palette.mode === 'dark';
  return (
    <Box sx={{ borderRadius: '18px', overflow: 'hidden', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}` }}>
      <Skeleton variant='rectangular' height={155} animation='wave' />
      <Box sx={{ p: 1.75, display: 'flex', flexDirection: 'column', gap: 0.9 }}>
        <Skeleton variant='text' width='55%' height={13} animation='wave' />
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Skeleton variant='rounded' width={52} height={16} animation='wave' sx={{ borderRadius: '50px' }} />
          <Skeleton variant='rounded' width={52} height={16} animation='wave' sx={{ borderRadius: '50px' }} />
        </Box>
      </Box>
    </Box>
  );
};

// 
// EMPTY STATE
// 
const EMPTY_COPY = [
  {
    icon: <FlightTakeoffRoundedIcon sx={{ fontSize: 36, color: '#FF385C' }} />,
    title: 'Your next great adventure is one plan away',
    body: "You haven't mapped any trips yet — but every explorer starts somewhere. Dream big, plan boldly, and let Tripician do the rest.",
    cta: 'Start Planning',
  },
  {
    icon: <FavoriteBorderRoundedIcon sx={{ fontSize: 36, color: '#FF385C' }} />,
    title: 'Trips that caught your eye will live here',
    body: "Explore the community, save trips that inspire you, and build a collection of journeys worth revisiting.",
    cta: 'Explore Community',
  },
  {
    icon: <ArchiveRoundedIcon sx={{ fontSize: 36, color: '#FF385C' }} />,
    title: 'Nothing archived yet',
    body: 'Old trips you tuck away will appear here. Think of it as your travel memory vault.',
    cta: 'View My Plans',
  },
];

const EmptyState: React.FC<{ tabIndex: number; onCTA: () => void }> = ({ tabIndex, onCTA }) => {
  const isDark = useTheme().palette.mode === 'dark';
  const copy = EMPTY_COPY[tabIndex] ?? EMPTY_COPY[0];
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
      <Box sx={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        py: { xs: 7, md: 10 }, px: { xs: 3, sm: 6 }, gap: 2.5, borderRadius: '24px',
        background: isDark ? 'linear-gradient(145deg,rgba(255,56,92,0.04),rgba(14,18,24,0.7))' : 'linear-gradient(145deg,rgba(255,56,92,0.03),rgba(255,255,255,0.9))',
        border: `1.5px dashed ${isDark ? 'rgba(255,56,92,0.2)' : 'rgba(255,56,92,0.16)'}`,
      }}>
        <motion.div animate={{ y: [-6, 6, -6] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
          <Box sx={{ width: 80, height: 80, borderRadius: '24px', background: 'linear-gradient(135deg,rgba(255,56,92,0.14),rgba(255,56,92,0.04))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid rgba(255,56,92,0.22)', boxShadow: '0 10px 34px rgba(255,56,92,0.12)' }}>
            {copy.icon}
          </Box>
        </motion.div>
        <Box sx={{ maxWidth: 380 }}>
          <Typography sx={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontStyle: 'italic', fontSize: { xs: '1.3rem', sm: '1.55rem' }, color: 'text.primary', mb: 1.25, lineHeight: 1.25 }}>{copy.title}</Typography>
          <Typography sx={{ fontSize: { xs: 13.5, sm: 14 }, color: 'text.secondary', lineHeight: 1.75 }}>{copy.body}</Typography>
        </Box>
        <motion.div whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.97 }}>
          <Button onClick={onCTA} startIcon={<AddCircleOutlineRoundedIcon />} sx={{ textTransform: 'none', fontWeight: 800, fontSize: 14, px: 4, py: 1.3, borderRadius: '50px', background: 'linear-gradient(135deg,#FF385C,#E31C5F)', color: '#fff', boxShadow: '0 6px 24px rgba(255,56,92,0.4)', fontFamily: "'Inter',sans-serif", '&:hover': { background: 'linear-gradient(135deg,#e02d50,#c91855)', boxShadow: '0 10px 32px rgba(255,56,92,0.5)' } }}>
            {copy.cta}
          </Button>
        </motion.div>
      </Box>
    </motion.div>
  );
};

// 
// SIDE CARD
// 
const SideCard: React.FC<{ children: React.ReactNode; headerIcon: React.ReactNode; headerLabel: string; accent?: string }> = ({ children, headerIcon, headerLabel, accent = '#FF385C' }) => {
  const isDark = useTheme().palette.mode === 'dark';
  return (
    <Box sx={{ borderRadius: '20px', overflow: 'hidden', mb: 2, border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`, background: isDark ? 'rgba(18,23,30,0.98)' : '#fff', boxShadow: isDark ? '0 6px 30px rgba(0,0,0,0.35)' : '0 6px 30px rgba(0,0,0,0.06)' }}>
      <Box sx={{ px: 2.25, pt: 2, pb: 1.75, background: `linear-gradient(135deg,${accent}12,${accent}04)`, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 28, height: 28, borderRadius: '9px', background: `linear-gradient(135deg,${accent},${accent}cc)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 3px 10px ${accent}45` }}>
          {headerIcon}
        </Box>
        <Typography sx={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>{headerLabel}</Typography>
      </Box>
      {children}
    </Box>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════════════
const Profile: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  // const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { token, logout } = useAuthToken();
  const { logout: auth0Logout } = useAuth0();
  const { profile, loading, error } = useSelector((state: RootState) => state.user);

  const [activeTab, setActiveTab] = useState(0);
  const [myTrips, setMyTrips] = useState<any[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [defaultBanner, setDefaultBanner] = useState<string | null>(null);

  useEffect(() => { dispatch(fetchUserProfile()); }, [dispatch]);

  // Load Unsplash banner for fallback
  useEffect(() => {
    let cancelled = false;
    loadDefaultBanner().then(url => { if (!cancelled) setDefaultBanner(url); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!token) return;
    let active = true;
    setTripsLoading(true);
    (async () => {
      try {
        const resp = await apiServices.getDashboardTrips(token);
        if (!active) return;
        const data = Array.isArray(resp?.data) ? resp.data
          : Array.isArray(resp?.data?.trips) ? resp.data.trips : [];
        setMyTrips(data);
      } catch { /* silent */ } finally { if (active) setTripsLoading(false); }
    })();
    return () => { active = false; };
  }, [token]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      auth0Logout({ logoutParams: { returnTo: window.location.origin } });
    } catch { /* ignore */ } finally { setIsLoggingOut(false); }
  };

  const handleTripClick = (trip: any) => {
    const id = trip.id || trip.Id;
    if (id) navigate(`/trip/${id}`, { state: { trip } });
  };

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : undefined;

  // Derived trip lists
  const publishedTrips = useMemo(
    () => myTrips.filter(t => t.published === true || (t.status || '').toUpperCase() === 'PUBLISHED'),
    [myTrips],
  );
  const likedTrips = useMemo(
    () => myTrips.filter(t => t.liked === true || t.isLiked === true),
    [myTrips],
  );
  const archivedTrips = useMemo(
    () => myTrips.filter(t => t.archived === true || (t.status || '').toUpperCase() === 'ARCHIVED'),
    [myTrips],
  );

  // Stats
  const soloTrips = useMemo(
    () => myTrips.filter(t => !(t.travelType || t.tripType || '').toLowerCase().includes('group')).length,
    [myTrips],
  );
  const groupTrips = useMemo(
    () => myTrips.filter(t => (t.travelType || t.tripType || '').toLowerCase().includes('group')).length,
    [myTrips],
  );
  const uniqueCountries = useMemo(() => {
    const s = new Set<string>();
    myTrips.forEach(t => (t.countries || []).forEach((c: string) => s.add(c)));
    return s.size;
  }, [myTrips]);

  // Tabs
  const TABS = [
    { label: 'My Plans', trips: myTrips },
    { label: 'Liked', trips: likedTrips },
    { label: 'Archived', trips: archivedTrips },
  ];
  const displayTrips = TABS[activeTab]?.trips ?? myTrips;
  const tabCTA = [
    () => navigate('/dashboard'),
    () => navigate('/community'),
    () => setActiveTab(0),
  ];

  //  States 
  if (loading) {
    return (
      <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: isDark ? '#07090c' : '#f2f4f8', display: 'flex', flexDirection: 'column' }}>
        <TopBar />
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}>
            <Box sx={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid rgba(255,56,92,0.15)', borderTopColor: '#FF385C' }} />
          </motion.div>
          <Typography sx={{ fontFamily: "'Playfair Display',serif", fontStyle: 'italic', fontSize: '1rem', color: 'text.secondary' }}>
            Loading your profile…
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: isDark ? '#07090c' : '#f2f4f8' }}>
        <TopBar />
        <Container maxWidth='sm' sx={{ pt: 6 }}>
          <Alert severity='error' sx={{ borderRadius: 3 }} action={<Button size='small' onClick={() => dispatch(fetchUserProfile({ force: true }))}>Retry</Button>}>
            {error}
          </Alert>
        </Container>
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: isDark ? '#07090c' : '#f2f4f8', display: 'flex', flexDirection: 'column' }}>
        <TopBar />
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Alert severity='warning' sx={{ borderRadius: 3 }}>Please sign in to view your profile.</Alert>
        </Box>
      </Box>
    );
  }

  const fullName = [profile.fname, profile.lname].filter(Boolean).join(' ') || 'Tripician Explorer';
  const initials = [(profile.fname || '')[0], (profile.lname || '')[0]].filter(Boolean).join('').toUpperCase() || 'T';
  const hasSocials = profile.instagram || profile.twitter || profile.facebook || profile.website;
  const hasDetails = profile.email || profile.phone || profile.country || (profile.gender && profile.gender !== 'NA') || profile.dateOfBirth;

  const bannerSrc = profile.coverpicture || defaultBanner;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: isDark ? '#07090c' : '#f0f2f5', display: 'flex', flexDirection: 'column' }}>
      <TopBar />

      {/* ══════════ HERO ══════════ */}
      <Box sx={{ flexShrink: 0 }}>
        {/* Banner */}
        <Box sx={{ height: { xs: 180, sm: 220, md: 260 }, position: 'relative', overflow: 'hidden' }}>
          {bannerSrc ? (
            <Box component='img' src={bannerSrc} alt='Cover' sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            // Fallback only shown while Unsplash loads
            <Box sx={{ width: '100%', height: '100%', background: isDark ? 'linear-gradient(135deg,#0d1b2a,#1a2a3a)' : 'linear-gradient(135deg,#0f2027,#2c5364)' }} />
          )}
          {/* Gradient vignette */}
          <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.82) 0%,rgba(0,0,0,0.2) 50%,rgba(0,0,0,0.1) 100%)', pointerEvents: 'none' }} />

          {/* Action buttons */}
          <Box sx={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 0.75, zIndex: 5 }}>
            <Tooltip title='Edit Profile' placement='bottom'>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}>
                <IconButton sx={{ bgcolor: 'rgba(0,0,0,0.48)', color: '#fff', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)', width: 36, height: 36, '&:hover': { bgcolor: 'rgba(255,255,255,0.14)' } }}>
                  <EditRoundedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </motion.div>
            </Tooltip>
            <Tooltip title='Sign Out' placement='bottom'>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}>
                <IconButton onClick={handleLogout} disabled={isLoggingOut} sx={{ bgcolor: 'rgba(0,0,0,0.48)', color: '#fff', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)', width: 36, height: 36, '&:hover': { bgcolor: 'rgba(210,28,56,0.55)' } }}>
                  {isLoggingOut ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : <LogoutRoundedIcon sx={{ fontSize: 16 }} />}
                </IconButton>
              </motion.div>
            </Tooltip>
          </Box>
        </Box>

        {/*  Avatar + Identity  */}
        <Container maxWidth='xl' sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
          <Box sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'flex-end' },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 0, sm: 2.5 },
            mt: { xs: '-46px', sm: '-56px', md: '-64px' },
            mb: { xs: 2, md: 2.5 },
            position: 'relative', zIndex: 2,
          }}>
            {/* Avatar */}
            <Box sx={{ position: 'relative', flexShrink: 0 }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                style={{ position: 'absolute', inset: -3, borderRadius: '50%', background: 'conic-gradient(from 0deg,#FF385C,#f97316,#eab308,#10b981,#6366f1,#FF385C)', zIndex: 0, opacity: 0.85 }}
              />
              <Box sx={{ position: 'relative', zIndex: 1, borderRadius: '50%', p: '3px', background: isDark ? '#07090c' : '#f0f2f5' }}>
                <Avatar src={profile.profilepicture || undefined} sx={{
                  width: { xs: 82, sm: 98, md: 112 }, height: { xs: 82, sm: 98, md: 112 },
                  fontSize: { xs: '2rem', sm: '2.4rem', md: '2.75rem' }, fontWeight: 900,
                  fontFamily: "'Playfair Display',serif",
                  background: 'linear-gradient(135deg,#FF385C,#E31C5F)',
                  boxShadow: '0 8px 36px rgba(0,0,0,0.45)', color: '#fff',
                }}>{!profile.profilepicture && initials}</Avatar>
              </Box>
              <Box sx={{ position: 'absolute', bottom: 4, right: 4, zIndex: 3, width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#F59E0B,#D97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2.5px solid ${isDark ? '#07090c' : '#f0f2f5'}`, boxShadow: '0 3px 12px rgba(245,158,11,0.5)' }}>
                <EmojiEventsRoundedIcon sx={{ fontSize: 13, color: '#fff' }} />
              </Box>
            </Box>

            {/* Name + meta */}
            <Box sx={{ flex: 1, minWidth: 0, mt: { xs: 1.25, sm: 0 }, pb: { sm: 0.5 } }}>
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, type: 'spring', stiffness: 280, damping: 24 }}>
                <Typography sx={{
                  fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 900, fontStyle: 'italic',
                  fontSize: { xs: '1.5rem', sm: '1.85rem', md: '2.2rem' }, lineHeight: 1.1, mb: 0.5,
                  background: isDark ? 'linear-gradient(135deg,#fff 0%,rgba(255,255,255,0.7) 100%)' : 'linear-gradient(135deg,#0f172a,#334155)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  {fullName}
                </Typography>

                {(profile.location || profile.country) && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                    <LocationOnRoundedIcon sx={{ fontSize: 13, color: '#FF385C' }} />
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary', fontWeight: 500 }}>
                      {[profile.location, profile.country].filter(Boolean).join(', ')}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1.2, py: 0.35, borderRadius: '50px', background: 'linear-gradient(135deg,rgba(255,56,92,0.12),rgba(255,56,92,0.05))', border: '1px solid rgba(255,56,92,0.22)', mb: hasSocials ? 1 : 0 }}>
                  <AutoAwesomeIcon sx={{ fontSize: 11, color: '#FF385C' }} />
                  <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: '#FF385C', letterSpacing: '0.09em', textTransform: 'uppercase' }}>Premium Explorer</Typography>
                </Box>

                {hasSocials && (
                  <Box sx={{ display: 'flex', gap: 0.4, flexWrap: 'wrap' }}>
                    {[
                      { url: profile.instagram, Icon: InstagramIcon, color: '#E1306C', bg: 'rgba(225,48,108,0.1)', label: 'Instagram' },
                      { url: profile.twitter,   Icon: TwitterIcon,   color: '#1DA1F2', bg: 'rgba(29,161,242,0.1)',  label: 'Twitter'   },
                      { url: profile.facebook,  Icon: FacebookIcon,  color: '#1877F2', bg: 'rgba(24,119,242,0.1)',  label: 'Facebook'  },
                      { url: profile.website,   Icon: LanguageIcon,  color: 'inherit', bg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', label: 'Website' },
                    ].filter(s => s.url).map(({ url, Icon, color, bg, label }) => (
                      <Tooltip key={label} title={label}>
                        <motion.div whileHover={{ scale: 1.18, y: -2 }} whileTap={{ scale: 0.9 }}>
                          <IconButton size='small' component='a' href={url!} target='_blank' rel='noopener noreferrer'
                            sx={{ color, p: 0.6, borderRadius: '9px', '&:hover': { bgcolor: bg } }}>
                            <Icon sx={{ fontSize: 17 }} />
                          </IconButton>
                        </motion.div>
                      </Tooltip>
                    ))}
                  </Box>
                )}
              </motion.div>
            </Box>
          </Box>

          {/*  Stats bar  */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, type: 'spring', stiffness: 280, damping: 24 }}>
            <Box sx={{ display: 'flex', gap: { xs: 0.75, sm: 1.25 }, flexWrap: 'wrap', mb: 3 }}>
              <StatPill value={myTrips.length}      label='Total Trips'     icon={<ExploreRoundedIcon />} />
              <StatPill value={soloTrips}            label='Solo'            icon={<PersonRoundedIcon />} />
              <StatPill value={groupTrips}           label='Group'           icon={<PeopleRoundedIcon />} accent='#10b981' />
              <StatPill value={publishedTrips.length} label='Shared'         icon={<AutoAwesomeIcon />}   accent='#8B5CF6' />
              {uniqueCountries > 0 && (
                <StatPill value={uniqueCountries}   label='Countries'       icon={<PublicRoundedIcon />}  accent='#f97316' />
              )}
            </Box>
          </motion.div>
        </Container>
      </Box>

      {/* ══════════ MAIN CONTENT ══════════ */}
      <Container maxWidth='xl' sx={{ px: { xs: 2, sm: 3, md: 4 }, pb: 8, flex: 1 }}>
        <Box sx={{ display: 'flex', gap: { xs: 0, xl: 3.5 }, flexDirection: { xs: 'column', xl: 'row' }, alignItems: 'flex-start' }}>

          {/*  Trip grid  */}
          <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
            <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.25 }}>
              <PillTabs
                tabs={TABS.map(t => ({ label: t.label, count: t.trips.length }))}
                active={activeTab}
                onChange={setActiveTab}
              />
              {myTrips.length > 0 && (
                <motion.div whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.97 }}>
                  <Button onClick={() => navigate('/dashboard')} startIcon={<AddCircleOutlineRoundedIcon sx={{ fontSize: 16 }} />} sx={{ textTransform: 'none', fontWeight: 800, fontSize: 12.5, px: 2.5, py: 0.85, borderRadius: '50px', background: 'linear-gradient(135deg,#FF385C,#E31C5F)', color: '#fff', boxShadow: '0 4px 14px rgba(255,56,92,0.35)', fontFamily: "'Inter',sans-serif", '&:hover': { background: 'linear-gradient(135deg,#e02d50,#c91855)', boxShadow: '0 6px 22px rgba(255,56,92,0.48)' } }}>
                    New Journey
                  </Button>
                </motion.div>
              )}
            </Box>

            <AnimatePresence mode='wait'>
              {tripsLoading ? (
                <motion.div key='loading' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(4,1fr)' }, gap: 2 }}>
                    {Array.from({ length: 8 }).map((_, i) => <SkeletonTripCard key={i} />)}
                  </Box>
                </motion.div>
              ) : displayTrips.length === 0 ? (
                <motion.div key={`empty-${activeTab}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <EmptyState tabIndex={activeTab} onCTA={tabCTA[activeTab]} />
                </motion.div>
              ) : (
                <motion.div key={`trips-${activeTab}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(4,1fr)' }, gap: 2, alignItems: 'start' }}>
                    {displayTrips.map((trip, i) => (
                      <ProfileTripCard key={trip.id || i} trip={trip} index={i} onClick={() => handleTripClick(trip)} />
                    ))}
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>
          </Box>

          {/*  Sidebar  */}
          <Box sx={{ width: { xs: '100%', xl: 295 }, flexShrink: 0, mt: { xs: 3.5, xl: 0 } }}>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.24, type: 'spring', stiffness: 260, damping: 24 }}>

              {hasDetails && (
                <SideCard headerIcon={<AutoAwesomeIcon sx={{ fontSize: 14, color: '#fff' }} />} headerLabel='About Me' accent='#FF385C'>
                  <Box sx={{ px: 2.25, py: 0.75 }}>
                    <DetailRow icon={<EmailRoundedIcon sx={{ fontSize: 15 }} />}   label='Email'        value={profile.email} />
                    {profile.email && profile.phone       && <Divider sx={{ opacity: 0.3, my: 0.2 }} />}
                    <DetailRow icon={<PhoneRoundedIcon sx={{ fontSize: 15 }} />}   label='Phone'        value={profile.phone} />
                    {profile.phone && profile.country     && <Divider sx={{ opacity: 0.3, my: 0.2 }} />}
                    <DetailRow icon={<PublicRoundedIcon sx={{ fontSize: 15 }} />}  label='Country'      value={profile.country} />
                    {profile.country && profile.gender && profile.gender !== 'NA' && <Divider sx={{ opacity: 0.3, my: 0.2 }} />}
                    <DetailRow icon={<WcRoundedIcon sx={{ fontSize: 15 }} />}      label='Gender'       value={profile.gender && profile.gender !== 'NA' ? profile.gender : undefined} />
                    {profile.dateOfBirth                  && <Divider sx={{ opacity: 0.3, my: 0.2 }} />}
                    <DetailRow icon={<CakeRoundedIcon sx={{ fontSize: 15 }} />}    label='Date of Birth' value={formatDate(profile.dateOfBirth)} />
                  </Box>
                </SideCard>
              )}

              {Array.isArray(profile.bio?.highlights) && profile.bio!.highlights.length > 0 && (
                <SideCard headerIcon={<StarRoundedIcon sx={{ fontSize: 14, color: '#fff' }} />} headerLabel='Highlights' accent='#8B5CF6'>
                  <Box sx={{ px: 2.25, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                    {profile.bio!.highlights.map((h: any, i: number) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <Box sx={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{h.icon}</Box>
                        <Box>
                          <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1 }}>{h.label}</Typography>
                          <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mt: 0.2 }}>{h.value}</Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </SideCard>
              )}

              {hasSocials && (
                <SideCard headerIcon={<LanguageIcon sx={{ fontSize: 14, color: '#fff' }} />} headerLabel='Connect' accent='#1DA1F2'>
                  <Box sx={{ px: 2.25, py: 1.75, display: 'flex', flexWrap: 'wrap', gap: 0.9 }}>
                    {[
                      { url: profile.instagram, Icon: InstagramIcon, label: 'Instagram', iconColor: '#E1306C' },
                      { url: profile.twitter,   Icon: TwitterIcon,   label: 'Twitter',   iconColor: '#1DA1F2' },
                      { url: profile.facebook,  Icon: FacebookIcon,  label: 'Facebook',  iconColor: '#1877F2' },
                      { url: profile.website,   Icon: LanguageIcon,  label: 'Website',   iconColor: undefined },
                    ].filter(s => s.url).map(({ url, Icon, label, iconColor }) => (
                      <Chip key={label} component='a' href={url!} target='_blank' rel='noopener noreferrer' clickable
                        icon={<Icon sx={{ fontSize: 13, color: `${iconColor} !important` }} />} label={label} size='small'
                        sx={{ fontWeight: 700, fontSize: 11.5, borderRadius: '50px', fontFamily: "'Inter',sans-serif" }} />
                    ))}
                  </Box>
                </SideCard>
              )}
            </motion.div>
          </Box>

        </Box>
      </Container>
    </Box>
  );
};

export default Profile;
