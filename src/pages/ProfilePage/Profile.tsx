import React, { useEffect, useState, useMemo } from 'react';
import {
  Avatar, Box, Button, Chip, CircularProgress, IconButton, LinearProgress,
  Tab, Tabs, Tooltip, Typography, useTheme,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  IconArchive,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandX,
  IconCake,
  IconGenderBigender,
  IconHeart,
  IconLink,
  IconLogout,
  IconMail,
  IconMap,
  IconMapPin,
  IconMoon,
  IconSparkles,
  IconPhone,
  IconPlus,
  IconRoute,
  IconUsers,
  IconWorld,
} from '@tabler/icons-react';
import type { RootState, AppDispatch } from '../../store';
import { fetchUserProfile } from '../../store/userSlice';
import { apiServices } from '../../services/APIs/apiServices';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { useAuth0 } from '@auth0/auth0-react';
import { fetchUnsplashImage } from '../../services/unsplashService';
import ImageBadge from '../../components/ui/ImageBadge';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { CardGridSkeleton } from '../../components/ui/Skeletons';
import { staggerContainer, staggerItem, tabContent } from '../../utils/animations';

const CONTENT_MAX = 1200;

// Default banner fetched once from Unsplash - personalized by the user's location
const _defaultBannerCache: Record<string, string> = {};

async function loadDefaultBanner(place: string): Promise<string | null> {
  const key = place.trim().toLowerCase();
  if (_defaultBannerCache[key]) return _defaultBannerCache[key];

  const queries = [
    `${place} landscape travel`,
    `${place} aerial scenery`,
    `${place} nature travel`,
  ];

  for (const q of queries) {
    const url = await fetchUnsplashImage(q);
    if (url) { _defaultBannerCache[key] = url; return url; }
  }
  return null;
}

// ── trip card ──────────────────────────────────────────────────────────────

const ProfileTripCard: React.FC<{ trip: any; onClick: () => void }> = ({ trip, onClick }) => {
  const theme = useTheme();
  const cover = trip.bannerPhotoUrl || trip.BannerPhotoUrl || trip.photoUrl || trip.PhotoUrl || null;
  const [photo, setPhoto] = useState<string | null>(cover);

  useEffect(() => {
    if (cover) { setPhoto(cover); return; }
    const q = (Array.isArray(trip.countries) && trip.countries[0]
      ? trip.countries[0] : trip.name || 'travel').split(',')[0];
    let cancelled = false;
    fetchUnsplashImage(q).then(url => { if (!cancelled && url) setPhoto(url); });
    return () => { cancelled = true; };
  }, [cover, trip.countries, trip.name]);

  const nights = trip.totalNights ?? trip.targetNights ?? null;
  const countries: string[] = Array.isArray(trip.countries) ? trip.countries : [];
  const isPublished = trip.published === true || (trip.status || '').toUpperCase() === 'PUBLISHED';
  const isGroup = (trip.travelType || trip.tripType || '').toLowerCase().includes('group');

  const metaLine = [
    ...countries.slice(0, 2),
    countries.length > 2 ? `+${countries.length - 2}` : null,
    nights !== null ? `${nights} ${nights === 1 ? 'night' : 'nights'}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <motion.div whileHover={{ y: -4 }} onClick={onClick} style={{ cursor: 'pointer', height: '100%' }}>
      <Box sx={{
        height: '100%', display: 'flex', flexDirection: 'column',
        borderRadius: '16px', overflow: 'hidden',
        border: `1px solid ${theme.custom.surface.border}`,
        bgcolor: 'background.paper',
        boxShadow: theme.custom.shadows.card,
        transition: `box-shadow ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}`,
        '&:hover': { boxShadow: theme.custom.shadows.cardHover },
        '&:hover .trip-cover img': { transform: 'scale(1.04)' },
      }}>
        <Box className="trip-cover" sx={{ position: 'relative', aspectRatio: '4 / 3', overflow: 'hidden', bgcolor: theme.custom.surface.active }}>
          {photo ? (
            <Box component="img" src={photo} alt={trip.name || 'Trip photo'} sx={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              transition: `transform ${theme.custom.motion.duration.slow} ${theme.custom.motion.easing.standard}`,
            }} />
          ) : (
            <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconMapPin size={30} stroke={1.5} color={theme.palette.text.disabled} />
            </Box>
          )}
          {isPublished && (
            <ImageBadge sx={{ position: 'absolute', top: 12, left: 12 }}>Shared</ImageBadge>
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

        <Box sx={{ px: 1.75, pt: 1.5, pb: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
          <Typography noWrap sx={{ fontSize: 15, fontWeight: 650, letterSpacing: '-0.01em', color: 'text.primary' }}>
            {trip.name || 'Untitled Journey'}
          </Typography>
          {(metaLine || isGroup) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
              {isGroup && <IconUsers size={13} stroke={2} color={theme.palette.text.disabled} style={{ flexShrink: 0 }} />}
              <Typography noWrap sx={{ fontSize: 13, color: 'text.secondary' }}>
                {metaLine || 'Group trip'}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </motion.div>
  );
};

// ── sidebar card ───────────────────────────────────────────────────────────

const SideCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const theme = useTheme();
  return (
    <Box sx={{
      borderRadius: '16px', mb: 2.5,
      border: `1px solid ${theme.custom.surface.border}`,
      bgcolor: 'background.paper',
      boxShadow: theme.custom.shadows.card,
    }}>
      <Typography variant="subtitle2" sx={{ px: 2.5, pt: 2, pb: 1.25, color: 'text.primary' }}>
        {title}
      </Typography>
      <Box sx={{ px: 2.5, pb: 2.25 }}>{children}</Box>
    </Box>
  );
};

// Bio highlights store feather-style icon NAMES ("heart", "map-pin") - they must
// be mapped to real icon components or the raw name renders as text.
const HIGHLIGHT_ICONS: Record<string, React.ElementType> = {
  heart: IconHeart,
  map: IconMap,
  'map-pin': IconMapPin,
};

const HighlightIcon: React.FC<{ icon?: string }> = ({ icon }) => {
  const name = (icon || '').trim();
  const Mapped = HIGHLIGHT_ICONS[name.toLowerCase()];
  if (Mapped) return <Mapped size={17} stroke={1.8} />;
  // Emoji (or any non-ASCII glyph) stored directly is fine to render as text.
  if (name && /[^\x20-\x7E]/.test(name)) return <>{name}</>;
  return <IconSparkles size={17} stroke={1.8} />;
};

const DetailRow: React.FC<{ Icon: React.ElementType; label: string; value?: string | null }> = ({ Icon, label, value }) => {
  const theme = useTheme();
  if (!value?.trim()) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, py: 0.9 }}>
      <Box sx={{ pt: '2px', flexShrink: 0, color: theme.palette.text.disabled, display: 'flex' }}>
        <Icon size={16} stroke={1.8} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.disabled', lineHeight: 1.3 }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: 13.5, fontWeight: 500, color: 'text.primary', wordBreak: 'break-word', lineHeight: 1.4 }}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
};

// ── main ───────────────────────────────────────────────────────────────────

const Profile: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { token, logout } = useAuthToken();
  const { logout: auth0Logout } = useAuth0();
  const { profile, loading, error } = useSelector((state: RootState) => state.user);

  const [activeTab, setActiveTab] = useState(0);
  const [myTrips, setMyTrips] = useState<any[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [followStats, setFollowStats] = useState<{ followers: number; following: number }>({ followers: 0, following: 0 });
  const [vibePassport, setVibePassport] = useState<{
    vibes: Array<{ name: string; count: number; percentage: number }>;
    topCountries: string[];
    totalNights: number;
    totalTrips: number;
    favoriteVibe: string | null;
  } | null>(null);
  const [defaultBanner, setDefaultBanner] = useState<string | null>(null);
  const [coverFailed, setCoverFailed] = useState(false);

  useEffect(() => { dispatch(fetchUserProfile()); }, [dispatch]);

  // Cover fallback: Unsplash scenery for the user's location.
  // No location or country on file → no fetch; the cover stays a clean blank band.
  useEffect(() => {
    let cancelled = false;
    const place = profile?.location?.trim() || profile?.country?.trim();
    if (!place) { setDefaultBanner(null); return; }
    loadDefaultBanner(place).then(url => { if (!cancelled) setDefaultBanner(url); });
    return () => { cancelled = true; };
  }, [profile?.location, profile?.country]);

  // Fetch vibe passport
  useEffect(() => {
    if (!token) return;
    let active = true;
    (async () => {
      try {
        const resp = await apiServices.getVibePassport(token);
        if (!active) return;
        setVibePassport(resp.data);
      } catch { /* silent - optional enrichment */ }
    })();
    return () => { active = false; };
  }, [token]);

  // Fetch follow stats
  useEffect(() => {
    if (!profile?.id) return;
    const profileId = Number(profile.id);
    if (!Number.isFinite(profileId)) return;
    let active = true;
    (async () => {
      try {
        const resp = await apiServices.getFollowStats(profileId);
        if (!active) return;
        setFollowStats(resp.data);
      } catch { /* silent */ }
    })();
    return () => { active = false; };
  }, [profile?.id]);

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
  const likedTrips = useMemo(
    () => myTrips.filter(t => t.liked === true || t.isLiked === true),
    [myTrips],
  );
  const archivedTrips = useMemo(
    () => myTrips.filter(t => t.archived === true || (t.status || '').toUpperCase() === 'ARCHIVED'),
    [myTrips],
  );
  const uniqueCountries = useMemo(() => {
    const s = new Set<string>();
    myTrips.forEach(t => (t.countries || []).forEach((c: string) => s.add(c)));
    return s.size;
  }, [myTrips]);

  const TABS = [
    { label: 'My plans', trips: myTrips },
    { label: 'Liked', trips: likedTrips },
    { label: 'Archived', trips: archivedTrips },
  ];
  const displayTrips = TABS[activeTab]?.trips ?? myTrips;

  const EMPTY_STATES = [
    {
      icon: IconRoute,
      title: 'Your next great adventure is one plan away',
      description: "You haven't mapped any trips yet. Dream big, plan boldly, and let Tripician do the rest.",
      actionLabel: 'Start planning',
      onAction: () => navigate('/dashboard'),
    },
    {
      icon: IconHeart,
      title: 'Trips that caught your eye will live here',
      description: 'Explore the community and like the journeys that inspire you.',
      actionLabel: 'Explore community',
      onAction: () => navigate('/community'),
    },
    {
      icon: IconArchive,
      title: 'Nothing archived yet',
      description: 'Old trips you tuck away will appear here - your travel memory vault.',
      actionLabel: 'View my plans',
      onAction: () => setActiveTab(0),
    },
  ];

  // ── page states ──
  if (loading) {
    return (
      <Box sx={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ErrorState
          title="Couldn't load your profile"
          description={error}
          onRetry={() => dispatch(fetchUserProfile({ force: true }))}
        />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <EmptyState
          icon={IconUsers}
          title="Sign in to view your profile"
          description="Your trips, stats, and travel identity live here once you're signed in."
          actionLabel="Sign in"
          onAction={() => navigate('/signin')}
        />
      </Box>
    );
  }

  const fullName = [profile.fname, profile.lname].filter(Boolean).join(' ') || 'Tripician Explorer';
  const initials = [(profile.fname || '')[0], (profile.lname || '')[0]].filter(Boolean).join('').toUpperCase() || 'T';
  const hasDetails = profile.email || profile.phone || profile.country || (profile.gender && profile.gender !== 'NA') || profile.dateOfBirth;
  const bannerSrc = (!coverFailed && profile.coverpicture) || defaultBanner;
  const locationLine = [profile.location, profile.country].filter(Boolean).join(', ');

  const socials = [
    { url: profile.instagram, Icon: IconBrandInstagram, label: 'Instagram' },
    { url: profile.twitter, Icon: IconBrandX, label: 'X' },
    { url: profile.facebook, Icon: IconBrandFacebook, label: 'Facebook' },
    { url: profile.website, Icon: IconLink, label: 'Website' },
  ].filter(s => s.url);

  const statItems = [
    { value: myTrips.length, label: myTrips.length === 1 ? 'trip' : 'trips' },
    { value: uniqueCountries, label: uniqueCountries === 1 ? 'country' : 'countries' },
    { value: followStats.followers, label: followStats.followers === 1 ? 'follower' : 'followers' },
    { value: followStats.following, label: 'following' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box sx={{ maxWidth: CONTENT_MAX, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 3, md: 4 }, pb: 10 }}>
        <motion.div initial="hidden" animate="visible" variants={staggerContainer(0.08, 0.05)}>

          {/* ── Cover ── */}
          <motion.div variants={staggerItem}>
            <Box sx={{
              height: { xs: 150, sm: 200, md: 240 }, borderRadius: '20px', overflow: 'hidden',
              border: `1px solid ${theme.custom.surface.border}`,
              background: theme.custom.gradients.brandSubtle,
            }}>
              {bannerSrc && (
                <Box
                  component="img" src={bannerSrc} alt=""
                  onError={() => {
                    // Broken cover URL → try the Unsplash fallback; if that fails too, stay blank
                    if (!coverFailed && profile.coverpicture) setCoverFailed(true);
                    else setDefaultBanner(null);
                  }}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              )}
            </Box>
          </motion.div>

          {/* ── Identity row ── */}
          <motion.div variants={staggerItem}>
            <Box sx={{
              display: 'flex', gap: { xs: 2, sm: 3 },
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'flex-end' },
              px: { xs: 2, sm: 4 },
              mt: { xs: -5.5, sm: -6.5 },
              position: 'relative', zIndex: 1,
            }}>
              <Avatar
                src={profile.profilepicture || undefined}
                sx={{
                  width: { xs: 96, sm: 112 }, height: { xs: 96, sm: 112 },
                  fontSize: '2.4rem', bgcolor: 'primary.main', color: '#fff',
                  border: `4px solid ${theme.palette.background.default}`,
                  boxShadow: theme.custom.shadows.card,
                  flexShrink: 0,
                }}
              >
                {!profile.profilepicture && initials}
              </Avatar>

              <Box sx={{ flex: 1, minWidth: 0, pb: 0.5}}>
                <Typography component="h1" noWrap sx={{
                  fontFamily: theme.custom.fontDisplay, fontWeight: 700,
                  fontSize: { xs: '1.6rem', md: '2rem' },
                  letterSpacing: '-0.02em', lineHeight: 1.15, color: 'text.primary',
                }}>
                  {fullName}
                </Typography>
                {locationLine && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, color: 'text.secondary' }}>
                    <IconMapPin size={14} stroke={1.9} />
                    <Typography noWrap sx={{ fontSize: 13.5 }}>{locationLine}</Typography>
                  </Box>
                )}
              </Box>

              {/* Actions */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 0.5 }}>
                {socials.map(({ url, Icon, label }) => (
                  <Tooltip key={label} title={label}>
                    <IconButton
                      component="a" href={url!} target="_blank" rel="noopener noreferrer" size="small"
                      sx={{ color: 'text.secondary', border: `1px solid ${theme.custom.surface.border}`, '&:hover': { color: 'text.primary' } }}
                    >
                      <Icon size={16} stroke={1.9} />
                    </IconButton>
                  </Tooltip>
                ))}
                <Button variant="outlined" size="small" onClick={() => navigate('/settings')}>
                  Edit profile
                </Button>
                <Tooltip title="Sign out">
                  <IconButton
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    size="small"
                    sx={{ color: 'text.secondary', border: `1px solid ${theme.custom.surface.border}`, '&:hover': { color: 'error.main' } }}
                  >
                    {isLoggingOut ? <CircularProgress size={14} /> : <IconLogout size={16} stroke={1.9} />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </motion.div>

          {/* ── Stats row ── */}
          <motion.div variants={staggerItem}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap', px: { xs: 2, sm: 4 }, mt: 2 }}>
              {statItems.map(s => (
                <Typography key={s.label} sx={{ fontSize: 14, color: 'text.secondary' }}>
                  <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{s.value}</Box> {s.label}
                </Typography>
              ))}
            </Box>
          </motion.div>

          {/* ── Content: trips + sidebar ── */}
          <Box sx={{
            display: 'flex', gap: { xs: 0, lg: 4 },
            flexDirection: { xs: 'column', lg: 'row' },
            alignItems: 'flex-start',
            mt: { xs: 3.5, md: 4.5 },
          }}>
            {/* Trips */}
            <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
              <motion.div variants={staggerItem}>
                <Box sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5,
                  borderBottom: `1px solid ${theme.custom.surface.border}`,
                }}>
                  <Tabs value={activeTab} onChange={(_, v: number) => setActiveTab(v)} sx={{ minHeight: 44 }}>
                    {TABS.map((t, i) => (
                      <Tab key={t.label} value={i} disableRipple label={`${t.label}${t.trips.length ? ` · ${t.trips.length}` : ''}`} />
                    ))}
                  </Tabs>
                  <Button
                    variant="contained" size="small"
                    startIcon={<IconPlus size={15} />}
                    onClick={() => navigate('/dashboard')}
                    sx={{ flexShrink: 0, display: { xs: 'none', sm: 'inline-flex' } }}
                  >
                    New trip
                  </Button>
                </Box>
              </motion.div>

              <Box sx={{ mt: 3 }}>
                <AnimatePresence mode="wait">
                  <motion.div key={`tab-${activeTab}-${tripsLoading}`} variants={tabContent} initial="initial" animate="animate" exit="exit" inherit={false}>
                    {tripsLoading ? (
                      <CardGridSkeleton count={6} minWidth={260} />
                    ) : displayTrips.length === 0 ? (
                      <EmptyState {...EMPTY_STATES[activeTab]} />
                    ) : (
                      <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                        gap: 2.5, alignItems: 'stretch',
                      }}>
                        {displayTrips.map((trip, i) => (
                          <ProfileTripCard key={trip.id || i} trip={trip} onClick={() => handleTripClick(trip)} />
                        ))}
                      </Box>
                    )}
                  </motion.div>
                </AnimatePresence>
              </Box>
            </Box>

            {/* Sidebar */}
            <Box sx={{ width: { xs: '100%', lg: 300 }, flexShrink: 0, mt: { xs: 4, lg: 0 } }}>
              <motion.div variants={staggerItem}>

                {vibePassport && vibePassport.vibes.length > 0 && (
                  <SideCard title="Vibe passport">
                    {vibePassport.vibes.map((v) => (
                      <Box key={v.name} sx={{ mb: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography sx={{ fontSize: 12.5, fontWeight: 600, textTransform: 'capitalize', color: 'text.primary' }}>
                            {v.name}
                          </Typography>
                          <Typography sx={{ fontSize: 12, fontWeight: 550, color: 'text.disabled' }}>
                            {v.percentage}%
                          </Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={v.percentage} />
                      </Box>
                    ))}
                    {vibePassport.totalNights > 0 && (
                      <Box sx={{ mt: 1.75, pt: 1.5, borderTop: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary' }}>
                        <IconMoon size={14} stroke={1.9} />
                        <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                          {vibePassport.totalNights} nights traveled
                        </Typography>
                      </Box>
                    )}
                    {vibePassport.topCountries.length > 0 && (
                      <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
                        {vibePassport.topCountries.slice(0, 6).map((c) => (
                          <Chip key={c} label={c} size="small" variant="outlined" sx={{ fontSize: 11.5, height: 22 }} />
                        ))}
                      </Box>
                    )}
                  </SideCard>
                )}

                {hasDetails && (
                  <SideCard title="About">
                    <DetailRow Icon={IconMail} label="Email" value={profile.email} />
                    <DetailRow Icon={IconPhone} label="Phone" value={profile.phone} />
                    <DetailRow Icon={IconWorld} label="Country" value={profile.country} />
                    <DetailRow Icon={IconGenderBigender} label="Gender" value={profile.gender && profile.gender !== 'NA' ? profile.gender : undefined} />
                    <DetailRow Icon={IconCake} label="Date of birth" value={formatDate(profile.dateOfBirth)} />
                  </SideCard>
                )}

                {Array.isArray(profile.bio?.highlights) && profile.bio!.highlights.length > 0 && (
                  <SideCard title="Highlights">
                    {profile.bio!.highlights.map((h: any, i: number) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 0.75 }}>
                        <Box sx={{ fontSize: 17, lineHeight: 1, flexShrink: 0, display: 'flex', alignItems: 'center', color: 'primary.main' }}>
                          <HighlightIcon icon={h.icon} />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.3 }}>
                            {h.label}
                          </Typography>
                          <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 550, color: 'text.primary' }}>
                            {h.value}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </SideCard>
                )}
              </motion.div>
            </Box>
          </Box>
        </motion.div>
      </Box>
    </Box>
  );
};

export default Profile;
