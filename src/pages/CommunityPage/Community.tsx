import React from 'react';
import {
  Avatar, Box, Button, InputBase, Skeleton, Tab, Tabs, Typography, useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  IconArrowRight,
  IconBuildingSkyscraper,
  IconCheck,
  IconClock,
  IconCompass,
  IconFlame,
  IconFlower,
  IconLeaf,
  IconMountain,
  IconPalette,
  IconSearch,
  IconSparkles,
  IconTrees,
  IconUserPlus,
  IconUsers,
  IconWorld,
} from '@tabler/icons-react';
import CommunityTripCard from './CommunityTripCard';
import { VIBES } from './vibes';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { apiServices } from '../../services/APIs/apiServices';
import { fetchUnsplashImage } from '../../services/unsplashService';
import blogsData from '../../assets/blogs/blogs.json';
import Seo from '../../components/Seo';
import { tripPath } from '../../utils/tripSlug';
import SectionHeader from '../../components/ui/SectionHeader';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { CardGridSkeleton } from '../../components/ui/Skeletons';
import { staggerContainer, staggerItem, tabContent } from '../../utils/animations';

// ── constants ──────────────────────────────────────────────────────────────

const CONTENT_MAX = 1280;

type ViewId = 'trips' | 'crew' | 'templates';

const CATEGORIES: { id: string; label: string; Icon: React.ElementType }[] = [
  { id: 'all', label: 'All', Icon: IconWorld },
  { id: 'adventure', label: 'Adventure', Icon: IconMountain },
  { id: 'culture', label: 'Culture', Icon: IconPalette },
  { id: 'urban', label: 'Urban', Icon: IconBuildingSkyscraper },
  { id: 'scenic', label: 'Scenic', Icon: IconTrees },
  { id: 'spiritual', label: 'Spiritual', Icon: IconFlower },
  { id: 'luxury', label: 'Slow Travel', Icon: IconLeaf },
  { id: 'romantic', label: 'Party', Icon: IconFlame },
];

// ── small shared pieces ────────────────────────────────────────────────────

/** Resolves a display photo for a trip: own photo first, Unsplash fallback. */
const useTripPhoto = (trip: any) => {
  const [photo, setPhoto] = React.useState<string | null>(trip?.photoUrl || null);
  React.useEffect(() => {
    if (!trip) return;
    if (trip.photoUrl) { setPhoto(trip.photoUrl); return; }
    let cancelled = false;
    const query = (trip.countries?.[0] || trip.name || 'travel landscape').split(',')[0];
    fetchUnsplashImage(query).then(url => { if (!cancelled && url) setPhoto(url); });
    return () => { cancelled = true; };
  }, [trip]);
  return photo;
};

/** Filter chip used for categories and crew vibes. Active = inverted fill. */
const FilterChip: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
  Icon?: React.ElementType;
}> = ({ label, active, onClick, Icon }) => {
  const theme = useTheme();
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.75, flexShrink: 0,
        height: 34, px: 1.75, borderRadius: 999,
        border: `1px solid ${active ? 'transparent' : theme.custom.surface.border}`,
        bgcolor: active ? 'text.primary' : 'background.paper',
        color: active ? 'background.paper' : 'text.secondary',
        fontFamily: 'inherit', fontSize: 13, fontWeight: 600, lineHeight: 1,
        cursor: 'pointer',
        transition: `all ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
        '&:hover': active ? {} : { borderColor: 'text.disabled', color: 'text.primary' },
        '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
      }}
    >
      {Icon && <Icon size={15} stroke={1.9} />}
      {label}
    </Box>
  );
};

/** Rounded search field matching the theme's focused-input treatment. */
const SearchField: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  sx?: object;
}> = ({ value, onChange, placeholder, sx }) => {
  const theme = useTheme();
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1.25,
      height: 42, px: 2, borderRadius: 999,
      border: `1px solid ${theme.custom.surface.border}`,
      bgcolor: 'background.paper',
      transition: `box-shadow ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}, border-color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
      '&:focus-within': {
        borderColor: 'primary.main',
        boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.14)}`,
      },
      ...sx,
    }}>
      <IconSearch size={17} stroke={1.9} color={theme.palette.text.disabled} style={{ flexShrink: 0 }} />
      <InputBase
        fullWidth
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        sx={{ fontSize: 14, fontWeight: 500 }}
      />
    </Box>
  );
};

// ── trip of the day feature card ───────────────────────────────────────────

const FeatureTripCard: React.FC<{ trip: any; onClick: () => void }> = ({ trip, onClick }) => {
  const theme = useTheme();
  const photo = useTripPhoto(trip);
  const countries: string[] = Array.isArray(trip.countries) ? trip.countries : [];
  const nights = typeof trip.totalNights === 'number' ? trip.totalNights
    : typeof trip.targetNights === 'number' ? trip.targetNights : null;
  const metaLine = [
    countries.slice(0, 3).join(' · ') || null,
    nights !== null ? `${nights} ${nights === 1 ? 'night' : 'nights'}` : null,
    trip.owner?.name ? `by ${trip.owner.name}` : null,
  ].filter(Boolean).join('  ·  ');

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '5fr 6fr' },
        borderRadius: '20px', overflow: 'hidden', cursor: 'pointer',
        border: `1px solid ${theme.custom.surface.border}`,
        bgcolor: 'background.paper',
        boxShadow: theme.custom.shadows.card,
        transition: `box-shadow ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}`,
        '&:hover': { boxShadow: theme.custom.shadows.cardHover },
        '&:hover .feature-cover img': { transform: 'scale(1.03)' },
      }}
    >
      {/* Editorial copy */}
      <Box sx={{
        order: { xs: 2, md: 1 },
        p: { xs: 3, md: 5 },
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1.5,
        minWidth: 0,
      }}>
        <Typography variant="overline" sx={{ color: 'primary.main' }}>
          Trip of the day
        </Typography>
        <Typography sx={{
          fontFamily: theme.custom.fontDisplay,
          fontWeight: 700,
          fontSize: { xs: '1.55rem', md: '2.1rem' },
          letterSpacing: '-0.02em', lineHeight: 1.15, color: 'text.primary',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {trip.name || 'Untitled Trip'}
        </Typography>
        {trip.description && (
          <Typography sx={{
            fontSize: 14.5, lineHeight: 1.6, color: 'text.secondary',
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {trip.description}
          </Typography>
        )}
        {metaLine && (
          <Typography noWrap sx={{ fontSize: 13, fontWeight: 550, color: 'text.secondary' }}>
            {metaLine}
          </Typography>
        )}
        <Box sx={{ mt: 1 }}>
          <Button variant="contained" endIcon={<IconArrowRight size={16} />}>
            View itinerary
          </Button>
        </Box>
      </Box>

      {/* Photo */}
      <Box className="feature-cover" sx={{
        order: { xs: 1, md: 2 },
        position: 'relative', overflow: 'hidden',
        minHeight: { xs: 210, sm: 260, md: 360 },
        bgcolor: theme.custom.surface.active,
      }}>
        {photo && (
          <Box
            component="img" src={photo} alt={trip.name || 'Featured trip'}
            sx={{
              position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
              transition: `transform ${theme.custom.motion.duration.slow} ${theme.custom.motion.easing.standard}`,
            }}
          />
        )}
      </Box>
    </Box>
  );
};

// ── travel guide card ──────────────────────────────────────────────────────

const BlogCard: React.FC<{ blog: any; onNavigate: (path: string) => void }> = ({ blog, onNavigate }) => {
  const theme = useTheme();
  const [photo, setPhoto] = React.useState<string | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    fetchUnsplashImage(`${blog.city} ${blog.country} travel`).then(url => { if (!cancelled && url) setPhoto(url); });
    return () => { cancelled = true; };
  }, [blog.city, blog.country]);

  return (
    <Box
      onClick={() => onNavigate(`/blog/${blog.slug}`)}
      sx={{
        flexShrink: 0, width: { xs: 264, sm: 300 },
        display: 'flex', flexDirection: 'column',
        borderRadius: '16px', overflow: 'hidden', cursor: 'pointer',
        border: `1px solid ${theme.custom.surface.border}`,
        bgcolor: 'background.paper',
        boxShadow: theme.custom.shadows.card,
        transition: `box-shadow ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}, transform ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}`,
        '&:hover': { boxShadow: theme.custom.shadows.cardHover, transform: 'translateY(-3px)' },
        '&:hover img': { transform: 'scale(1.04)' },
      }}
    >
      <Box sx={{ position: 'relative', aspectRatio: '16 / 9', overflow: 'hidden', bgcolor: theme.custom.surface.active }}>
        {photo && (
          <Box
            component="img" src={photo} alt={`${blog.city}, ${blog.country}`}
            sx={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              transition: `transform ${theme.custom.motion.duration.slow} ${theme.custom.motion.easing.standard}`,
            }}
          />
        )}
      </Box>
      <Box sx={{ p: 2, pt: 1.75, display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
        {blog.tag && (
          <Typography variant="overline" sx={{ color: 'primary.main', lineHeight: 1.4 }}>
            {blog.tag}
          </Typography>
        )}
        <Typography noWrap sx={{ fontSize: 15, fontWeight: 650, letterSpacing: '-0.01em', color: 'text.primary' }}>
          {blog.city}, {blog.country}
        </Typography>
        {blog.description && (
          <Typography sx={{
            fontSize: 13, lineHeight: 1.55, color: 'text.secondary',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {blog.description}
          </Typography>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, color: 'text.disabled', mt: 'auto', pt: 1 }}>
          <IconClock size={13} stroke={1.9} />
          <Typography sx={{ fontSize: 12, fontWeight: 550 }}>{blog.readTime}</Typography>
        </Box>
      </Box>
    </Box>
  );
};

// ── main component ─────────────────────────────────────────────────────────

const Community: React.FC = () => {
  const theme = useTheme();
  const { token } = useAuthToken();
  const navigate = useNavigate();

  const [trips, setTrips] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [activeCategory, setActiveCategory] = React.useState('all');
  const [search, setSearch] = React.useState('');

  const [activeView, setActiveView] = React.useState<ViewId>('trips');
  const [crewDest, setCrewDest] = React.useState('');
  const [crewVibe, setCrewVibe] = React.useState('');
  const [crewTravelers, setCrewTravelers] = React.useState<any[]>([]);
  const [crewLoading, setCrewLoading] = React.useState(false);
  const [templates, setTemplates] = React.useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = React.useState(false);
  const [connectingId, setConnectingId] = React.useState<number | null>(null);
  const [connectedIds, setConnectedIds] = React.useState<Set<number>>(new Set());
  const [crewSuggestions, setCrewSuggestions] = React.useState<any[]>([]);

  const fetchCrew = React.useCallback(async () => {
    setCrewLoading(true);
    try {
      const resp = await apiServices.getTravelersCrew(crewDest.trim() || undefined, crewVibe || undefined);
      setCrewTravelers(resp.data || []);
    } catch {
      setCrewTravelers([]);
    } finally {
      setCrewLoading(false);
    }
  }, [crewDest, crewVibe]);

  React.useEffect(() => {
    if (activeView === 'crew') { fetchCrew(); }
    if (activeView === 'templates') {
      setTemplatesLoading(true);
      apiServices.getTemplates()
        .then(r => setTemplates(r.data || []))
        .catch(() => setTemplates([]))
        .finally(() => setTemplatesLoading(false));
    }
  }, [activeView, fetchCrew]);

  // Fetch published trips (public endpoint - no auth required; token used only for personalised reactions later)
  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const fetchToken = token || localStorage.getItem('accessToken') || null;
    (async () => {
      try {
        const resp = await apiServices.getPublishedTrips(fetchToken ?? undefined);
        if (!active) return;
        const data = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp?.data?.trips) ? resp.data.trips : []);
        setTrips(data);
      } catch {
        if (!active) return;
        // Fallback: try explicit public endpoint
        try {
          const resp2 = await apiServices.getPublicTrips(fetchToken ?? undefined);
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
  }, [token, reloadKey]);

  // Auto-fetch crew suggestions for the "Travelers right now" strip
  React.useEffect(() => {
    let active = true;
    apiServices.getTravelersCrew(undefined, undefined).then(r => {
      if (!active) return;
      setCrewSuggestions((r.data || []).slice(0, 10));
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  // Filter logic - default view ranks by community engagement so "Trending" is real
  const engagementScore = (t: any) =>
    (Number(t.likesCount ?? t.likes) || 0) + 2 * (Number(t.cloneCount) || 0);

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
    } else {
      list = [...list].sort((a, b) => engagementScore(b) - engagementScore(a));
    }
    return list;
  }, [trips, activeCategory, search]);

  // Trip of the Day - deterministic daily rotation so every visit feels fresh
  const tripOfTheDay = React.useMemo(() => {
    if (trips.length === 0) return null;
    const dayIndex = Math.floor(Date.now() / 86400000);
    return trips[dayIndex % trips.length];
  }, [trips]);

  const handleTripClick = (trip: any) => {
    const tripId = trip.id || trip.Id;
    if (tripId) navigate(tripPath({ id: tripId, name: trip.name }), { state: { trip } });
  };

  const handleFollow = async (t: any) => {
    if (!token) { navigate('/signin'); return; }
    if (connectingId === t.userId || connectedIds.has(t.userId)) return;
    setConnectingId(t.userId);
    try {
      await apiServices.followUser(token, t.userId);
      setConnectedIds(prev => new Set([...prev, t.userId]));
      window.dispatchEvent(new CustomEvent('app:success', { detail: { message: `Now following ${t.name || 'this traveler'}` } }));
    } catch {
      window.dispatchEvent(new CustomEvent('app:error', { detail: { message: 'Could not connect. Please try again.' } }));
    } finally {
      setConnectingId(null);
    }
  };

  const isFiltering = activeCategory !== 'all' || !!search.trim();
  const activeCategoryLabel = CATEGORIES.find(c => c.id === activeCategory)?.label || 'All';

  const gridSx = {
    display: 'grid',
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
    gap: 3,
  } as const;

  const hiddenScrollbarSx = {
    display: 'flex', overflowX: 'auto', pb: 0.5,
    '::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none',
  } as const;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Seo
        title="Discover Trips, Travelers & Itineraries"
        description="Explore real travel itineraries published by the Tripician community - trending journeys, travel companions, templates, and guides for your next adventure."
        path="/community"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Tripician Community - Trip Discovery',
          url: 'https://tripician.com/community',
          description: 'Real travel itineraries, trending journeys, and travel companions from the Tripician community.',
        }}
      />

      <Box sx={{ maxWidth: CONTENT_MAX, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 3, md: 5 }, pb: 10 }}>
        <motion.div initial="hidden" animate="visible" variants={staggerContainer(0.08, 0.05)}>

          {/* ── Page header ── */}
          <motion.div variants={staggerItem}>
            <Typography component="h1" sx={{
              fontFamily: theme.custom.fontDisplay,
              fontWeight: 700,
              fontSize: { xs: '1.9rem', md: '2.4rem' },
              letterSpacing: '-0.02em', lineHeight: 1.1, color: 'text.primary',
            }}>
              Explore
            </Typography>
            <Typography sx={{ mt: 1, fontSize: 15, color: 'text.secondary', maxWidth: 560 }}>
              Real itineraries from travelers around the world.
            </Typography>
          </motion.div>

          {/* ── View tabs ── */}
          <motion.div variants={staggerItem}>
            <Tabs
              value={activeView}
              onChange={(_, v: ViewId) => setActiveView(v)}
              sx={{ mt: { xs: 2.5, md: 3.5 }, borderBottom: `1px solid ${theme.custom.surface.border}`, minHeight: 44 }}
            >
              <Tab value="trips" label="Trips" disableRipple />
              <Tab value="crew" label="Find crew" disableRipple />
              <Tab value="templates" label="Templates" disableRipple />
            </Tabs>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div key={activeView} variants={tabContent} initial="initial" animate="animate" exit="exit" inherit={false}>

              {/* ══ Trips view ══ */}
              {activeView === 'trips' && (
                <>
                  {/* Toolbar: category chips + search */}
                  <Box sx={{
                    mt: 3, display: 'flex', gap: 1.5,
                    flexDirection: { xs: 'column-reverse', md: 'row' },
                    alignItems: { xs: 'stretch', md: 'center' },
                    justifyContent: 'space-between',
                  }}>
                    <Box sx={{ ...hiddenScrollbarSx, gap: 1, minWidth: 0 }}>
                      {CATEGORIES.map(cat => (
                        <FilterChip
                          key={cat.id}
                          label={cat.label}
                          Icon={cat.Icon}
                          active={activeCategory === cat.id}
                          onClick={() => setActiveCategory(cat.id)}
                        />
                      ))}
                    </Box>
                    <SearchField
                      value={search}
                      onChange={setSearch}
                      placeholder="Search destinations, trips, vibes…"
                      sx={{ width: { xs: '100%', md: 320 }, flexShrink: 0 }}
                    />
                  </Box>

                  {/* Loading */}
                  {loading && (
                    <Box sx={{ mt: 4 }}>
                      <CardGridSkeleton count={6} minWidth={300} />
                    </Box>
                  )}

                  {/* Error */}
                  {!loading && error && (
                    <ErrorState
                      title="Couldn't load the community"
                      description={error}
                      onRetry={() => setReloadKey(k => k + 1)}
                    />
                  )}

                  {/* Trip of the day */}
                  {!loading && !error && tripOfTheDay && !isFiltering && (
                    <Box sx={{ mt: 4 }}>
                      <FeatureTripCard trip={tripOfTheDay} onClick={() => handleTripClick(tripOfTheDay)} />
                    </Box>
                  )}

                  {/* Trip grid */}
                  {!loading && !error && filtered.length > 0 && (
                    <Box sx={{ mt: { xs: 5, md: 6 } }}>
                      <SectionHeader
                        title={search.trim()
                          ? 'Search results'
                          : activeCategory === 'all' ? 'Trending journeys' : `${activeCategoryLabel} trips`}
                        subtitle={search.trim()
                          ? `${filtered.length} ${filtered.length === 1 ? 'trip matches' : 'trips match'} “${search.trim()}”`
                          : `${filtered.length} published ${filtered.length === 1 ? 'itinerary' : 'itineraries'}, ranked by community engagement`}
                      />
                      <Box sx={gridSx}>
                        <AnimatePresence mode="popLayout">
                          {filtered.map((trip, i) => (
                            <motion.div
                              key={trip.id || i}
                              layout
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.98 }}
                              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                              style={{ height: '100%' }}
                            >
                              <CommunityTripCard trip={trip} onClick={() => handleTripClick(trip)} />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </Box>
                    </Box>
                  )}

                  {/* Empty state */}
                  {!loading && !error && filtered.length === 0 && (
                    <EmptyState
                      icon={IconCompass}
                      title="No trips found"
                      description={isFiltering
                        ? 'Try different search terms or clear the filters to see every published journey.'
                        : 'No published trips yet - be the first to share an itinerary with the community.'}
                      actionLabel={isFiltering ? 'Clear filters' : 'Plan a trip'}
                      onAction={isFiltering
                        ? () => { setSearch(''); setActiveCategory('all'); }
                        : () => navigate('/tripplanner')}
                    />
                  )}

                  {/* Travelers right now */}
                  {crewSuggestions.length > 0 && (
                    <Box sx={{ mt: { xs: 5, md: 6 } }}>
                      <SectionHeader
                        title="Travelers right now"
                        subtitle="People planning and publishing trips at this moment"
                        action={
                          <Button variant="text" size="small" endIcon={<IconArrowRight size={15} />} onClick={() => setActiveView('crew')}>
                            See all
                          </Button>
                        }
                      />
                      <Box sx={{ ...hiddenScrollbarSx, gap: 1.5 }}>
                        {crewSuggestions.map((t: any) => (
                          <Box
                            key={t.userId}
                            onClick={() => navigate(`/traveler/${t.userId}`)}
                            sx={{
                              display: 'flex', alignItems: 'center', gap: 1.25, flexShrink: 0,
                              pl: 1, pr: 2.25, py: 1, borderRadius: 999, cursor: 'pointer',
                              border: `1px solid ${theme.custom.surface.border}`,
                              bgcolor: 'background.paper',
                              transition: `all ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
                              '&:hover': { borderColor: 'text.disabled', boxShadow: theme.custom.shadows.card },
                            }}
                          >
                            <Avatar src={t.avatar || undefined} sx={{ width: 38, height: 38, fontSize: 15, bgcolor: 'primary.main' }}>
                              {!t.avatar && (t.name || 'E').charAt(0).toUpperCase()}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography noWrap sx={{ fontSize: 13, fontWeight: 650, color: 'text.primary', maxWidth: 130 }}>
                                {(t.name || 'Explorer').split(' ')[0]}
                              </Typography>
                              <Typography noWrap sx={{ fontSize: 11.5, color: 'text.secondary', maxWidth: 130 }}>
                                {t.destinations?.[0] || `${t.tripCount} trip${t.tripCount !== 1 ? 's' : ''}`}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Travel guides */}
                  <Box sx={{ mt: { xs: 5, md: 6 } }}>
                    <SectionHeader
                      title="Travel guides"
                      subtitle="City-by-city reads to shape your next itinerary"
                      action={
                        <Button variant="text" size="small" endIcon={<IconArrowRight size={15} />} onClick={() => navigate('/blog')}>
                          Browse all
                        </Button>
                      }
                    />
                    <Box sx={{ ...hiddenScrollbarSx, gap: 2, pb: 1 }}>
                      {(blogsData as any[]).slice(0, 6).map((blog: any) => (
                        <BlogCard key={blog.id} blog={blog} onNavigate={(path) => navigate(path)} />
                      ))}
                    </Box>
                  </Box>
                </>
              )}

              {/* ══ Find crew view ══ */}
              {activeView === 'crew' && (
                <>
                  <Box sx={{
                    mt: 3, display: 'flex', gap: 1.5,
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: { xs: 'stretch', md: 'center' },
                  }}>
                    <SearchField
                      value={crewDest}
                      onChange={setCrewDest}
                      placeholder="Destination (e.g. Japan, Bali…)"
                      sx={{ width: { xs: '100%', md: 320 }, flexShrink: 0 }}
                    />
                    <Box sx={{ ...hiddenScrollbarSx, gap: 1 }}>
                      {['', 'adventure', 'culture', 'urban', 'scenic', 'spiritual'].map(v => (
                        <FilterChip
                          key={v || 'any'}
                          label={v ? (VIBES[v]?.label || v) : 'Any vibe'}
                          active={crewVibe === v}
                          onClick={() => setCrewVibe(v)}
                        />
                      ))}
                    </Box>
                  </Box>

                  {crewLoading ? (
                    <Box sx={{ mt: 4, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(4,1fr)' }, gap: 2.5 }}>
                      {Array.from({ length: 8 }).map((_, i) => (
                        <Box key={i} sx={{ borderRadius: '18px', p: 2.25, border: `1px solid ${theme.custom.surface.border}`, bgcolor: 'background.paper' }}>
                          <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                            <Skeleton variant="circular" width={48} height={48} />
                            <Box sx={{ flex: 1 }}>
                              <Skeleton variant="text" width="60%" height={18} />
                              <Skeleton variant="text" width="40%" height={14} />
                            </Box>
                          </Box>
                          <Skeleton variant="rounded" width="100%" height={32} sx={{ borderRadius: 999 }} />
                        </Box>
                      ))}
                    </Box>
                  ) : crewTravelers.length === 0 ? (
                    <EmptyState
                      icon={IconUsers}
                      title="No travelers found"
                      description="Try a different destination or remove the vibe filter to see more people."
                    />
                  ) : (
                    <Box sx={{ mt: 4, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(4,1fr)' }, gap: 2.5 }}>
                      {crewTravelers.map((t: any) => {
                        const isConnected = connectedIds.has(t.userId);
                        return (
                          <Box
                            key={t.userId}
                            sx={{
                              borderRadius: '18px', p: 2.25,
                              border: `1px solid ${theme.custom.surface.border}`,
                              bgcolor: 'background.paper',
                              boxShadow: theme.custom.shadows.card,
                              transition: `box-shadow ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}, transform ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}`,
                              '&:hover': { boxShadow: theme.custom.shadows.cardHover, transform: 'translateY(-2px)' },
                            }}
                          >
                            <Box
                              onClick={() => navigate(`/traveler/${t.userId}`)}
                              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.25, cursor: 'pointer', '&:hover .crew-name': { color: 'primary.main' } }}
                            >
                              <Avatar src={t.avatar || undefined} sx={{ width: 48, height: 48, fontSize: 17, bgcolor: 'primary.main' }}>
                                {!t.avatar && (t.name || 'E').charAt(0).toUpperCase()}
                              </Avatar>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography noWrap className="crew-name" sx={{ fontSize: 14.5, fontWeight: 650, color: 'text.primary', transition: 'color 120ms' }}>
                                  {t.name || 'Explorer'}
                                </Typography>
                                <Typography noWrap sx={{ fontSize: 12, color: 'text.secondary' }}>
                                  {t.tripCount} trip{t.tripCount !== 1 ? 's' : ''}
                                  {t.vibe ? ` · ${VIBES[t.vibe?.toLowerCase?.()]?.label || t.vibe}` : ''}
                                </Typography>
                              </Box>
                            </Box>
                            {Array.isArray(t.destinations) && t.destinations.length > 0 && (
                              <Typography noWrap sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1.5 }}>
                                {t.destinations.slice(0, 3).join(' · ')}
                                {t.destinations.length > 3 ? ` · +${t.destinations.length - 3}` : ''}
                              </Typography>
                            )}
                            <Button
                              onClick={() => handleFollow(t)}
                              size="small"
                              fullWidth
                              variant="outlined"
                              disabled={connectingId === t.userId}
                              startIcon={isConnected ? <IconCheck size={15} /> : <IconUserPlus size={15} />}
                              sx={isConnected
                                ? { borderColor: 'success.main', color: 'success.main', '&:hover': { borderColor: 'success.main', color: 'success.main', bgcolor: alpha(theme.palette.success.main, 0.06) } }
                                : undefined}
                            >
                              {connectingId === t.userId ? 'Connecting…' : isConnected ? 'Following' : 'Connect'}
                            </Button>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </>
              )}

              {/* ══ Templates view ══ */}
              {activeView === 'templates' && (
                <Box sx={{ mt: 4 }}>
                  {templatesLoading ? (
                    <CardGridSkeleton count={6} minWidth={300} />
                  ) : templates.length === 0 ? (
                    <EmptyState
                      icon={IconSparkles}
                      title="No templates yet"
                      description="Be the first to publish a community trip template."
                      actionLabel="Plan a trip"
                      onAction={() => navigate('/tripplanner')}
                    />
                  ) : (
                    <Box sx={gridSx}>
                      {templates.map((t: any, i: number) => (
                        <CommunityTripCard key={t.id || i} trip={t} onClick={() => handleTripClick(t)} />
                      ))}
                    </Box>
                  )}
                </Box>
              )}

            </motion.div>
          </AnimatePresence>
        </motion.div>
      </Box>
    </Box>
  );
};

export default Community;
