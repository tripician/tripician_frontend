import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import { KalaLotus } from '../../components/DecorativeComponents/KalaDecor';
import PageLoader from '../../components/CommonComponents/PageLoader';
import { useDispatch, useSelector } from 'react-redux';
import ExploreIcon from '@mui/icons-material/TravelExplore';

import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';

import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import QuickStartStrip from '../PageLayout/CommonLayouts/QuickStartStrip';

import { useAppShell } from '../PageLayout/AppShellContext';
import { useNavigate } from 'react-router-dom';
import { apiServices } from '../../services/APIs/apiServices';
import { fetchUnsplashImage } from '../../services/unsplashService';
import TripCard from '../DashboardPage/TripCard';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { countryAlpha3FromCode, countryAlpha3FromName, countryNameFromCode, countryCodeFromName } from '../../utils/countryFlags';
import type { AppDispatch } from '../../store';
import { clearUser } from '../../store/userSlice';

import gsap from 'gsap';
import blogsData from '../../assets/blogs/blogs.json';

/* Badge text → vibe emoji label */
const BADGE_TO_VIBE: Record<string, string> = {
  '🔥 Hot':      '🔥 Trending',
  '❤️ Romantic':  '❤️ Romantic',
  '🕰 Timeless':  '🕰 Timeless',
  '🏙 Modern':    '🏙 Urban',
};
/* Seed traveler counts by list position */
const DEST_TRAVELER_COUNTS = [2840, 1970, 3120, 1560];

const FEATURED_DESTINATIONS_BASE = blogsData.slice(0, 4).map((b, idx) => ({
  id: b.id,
  title: `${b.city}, ${b.country}`,
  query: `${b.city} ${b.country}`,
  description: b.description,
  trending: true,
  badge: b.badge,
  slug: b.slug,
  vibe: BADGE_TO_VIBE[b.badge] ?? null,
  travelerCount: DEST_TRAVELER_COUNTS[idx] ?? null,
}));

// Matches the palette used in TripCard's MemberAvatar for visual consistency
const AVATAR_COLORS = [
  'linear-gradient(135deg,#FF385C,#D91A50)',
  'linear-gradient(135deg,#0EA5E9,#0369A1)',
  'linear-gradient(135deg,#10B981,#047857)',
  'linear-gradient(135deg,#F59E0B,#B45309)',
  'linear-gradient(135deg,#8B5CF6,#6D28D9)',
  'linear-gradient(135deg,#EC4899,#BE185D)',
  'linear-gradient(135deg,#14B8A6,#0F766E)',
  'linear-gradient(135deg,#F97316,#C2410C)',
];
const avatarColor = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

const TRAVEL_FACTS: { emoji: string; fact: string; source: string }[] = [
  { emoji: '✈️', fact: 'There are 195 countries in the world. Most travellers visit only 3–5 in their lifetime — every trip you take puts you ahead of the curve.', source: 'UN World Atlas' },
  { emoji: '🌊', fact: 'The shortest international commercial flight is just 15 minutes — linking St. Maarten to Anguilla. Blink and you miss it.', source: 'Aviation Records' },
  { emoji: '🍽️', fact: 'Japan has more Michelin-starred restaurants than any other country — more than France and the USA combined.', source: 'Michelin Guide 2024' },
  { emoji: '🏔️', fact: 'The Maldives sits just 1.5 meters above sea level, making it the lowest-lying country on Earth. Every visit is precious.', source: 'Geographic Survey' },
  { emoji: '🧳', fact: 'Iceland has zero native mosquitoes. Its volcanic geology creates conditions that keep the island naturally mosquito-free.', source: 'Entomology Reports' },
  { emoji: '🌏', fact: 'Singapore Changi Airport features a 40-meter indoor waterfall, a rooftop pool, and a butterfly garden. Even the transit is a destination.', source: 'Changi Airport Group' },
  { emoji: '🗼', fact: 'France attracts over 90 million international tourists each year — more visitors than there are residents in the country.', source: 'World Tourism Org' },
  { emoji: '🚂', fact: 'The Trans-Siberian Railway spans 9,289 km across 8 time zones. The full journey end-to-end takes 7 days without stopping.', source: 'Russian Railways' },
  { emoji: '🦁', fact: 'Finland has over 187,000 lakes — more lakes per square kilometer than any other country in the world.', source: 'Finnish Atlas' },
  { emoji: '🌅', fact: 'The Great Wall of China is NOT visible from space with the naked eye. This myth has been officially debunked by astronauts on the ISS.', source: 'NASA Records' },
  { emoji: '🏝️', fact: "Norway's full coastline, including all fjords and islands, stretches over 100,000 km — long enough to circle the Earth more than twice.", source: 'Norwegian Mapping Authority' },
  { emoji: '🎌', fact: "Japan's Shinkansen bullet trains have an average delay of just 54 seconds per year. The most punctual railway system ever built.", source: 'JR East Statistics' },
];

const FEED_FILTER_LABELS = ['All', 'Wellness', 'Adventure', 'Cultural', 'Urban', 'Social'] as const;
type FeedFilter = typeof FEED_FILTER_LABELS[number];



const AlsoCheckoutAvatar: React.FC<{ member: { id: string; name: string; profilePic: string } }> = ({ member }) => {
  const [imgFailed, setImgFailed] = React.useState(false);
  const showImg = !imgFailed && !!member.profilePic;
  const color = avatarColor(member.id || member.name || '?');
  const initial = member.name?.charAt(0).toUpperCase() || '?';
  return (
    <Box sx={{
      width: 20, height: 20, borderRadius: '50%',
      background: showImg ? undefined : color,
      border: '1.5px solid rgba(255,255,255,0.5)',
      overflow: 'hidden', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.5rem', fontWeight: 800, color: '#fff',
      fontFamily: "'Inter',sans-serif",
    }}>
      {showImg
        ? <img src={member.profilePic} alt={member.name} onError={() => setImgFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : initial}
    </Box>
  );
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const pageRef      = useRef<HTMLDivElement>(null);
  const heroRef      = useRef<HTMLDivElement>(null);

  const [featuredImages, setFeaturedImages] = useState<Record<number, string>>({});
  const featuredDestinations = FEATURED_DESTINATIONS_BASE.map(d => ({ ...d, image: featuredImages[d.id] || '' }));

  const [publicTrips, setPublicTrips] = useState<any[]>([]);
  const [publicTripImages, setPublicTripImages] = useState<Record<string, string>>({});
  const [loadingPublic, setLoadingPublic] = useState(false);
  const [publicError, setPublicError] = useState<string | null>(null);
  const { openCreateTrip } = useAppShell();
  const { token: authToken, loading: authLoading } = useAuthToken();
  const [userTrips, setUserTrips] = useState<any[]>([]);
  const [userTripsLoading, setUserTripsLoading] = useState(true);
  const [, setUserTripsError] = useState<string | null>(null);
  


  const handleLogout = () => {
        try {
          // Remove stored tokens (adjust keys as needed)
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          // Clear redux user state
          dispatch(clearUser());
          navigate('/signin');
        } catch (e) {
          console.error('Logout error', e);
        }
      };

  // Fetch featured destination images from Unsplash on mount
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      FEATURED_DESTINATIONS_BASE.map(async (d) => {
        const url = await fetchUnsplashImage(d.query);
        return { id: d.id, url };
      })
    ).then((results) => {
      if (cancelled) return;
      const updates: Record<number, string> = {};
      results.forEach(({ id, url }) => { if (url) updates[id] = url; });
      if (Object.keys(updates).length > 0) setFeaturedImages(updates);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let active = true;
    const fetchPublic = async () => {
      if (authLoading) return;
      if (!authToken) { setLoadingPublic(false); return; }
      setLoadingPublic(true);
      try {
        const response = await apiServices.getPublishedTrips(authToken);
        if (active) {
          const trips = response.data || [];
          setPublicTrips(trips);
          // Kick off Unsplash fetches for trips without a user-uploaded photo
          const needsImage = trips.filter((t: any) => !(typeof t.photoUrl === 'string' && t.photoUrl.trim()));
          if (needsImage.length > 0) {
            Promise.all(
              needsImage.map(async (t: any) => {
                // Use first country, then trip name as search query
                const query = (Array.isArray(t.countries) && t.countries[0])
                  || t.name || t.title || 'travel destination';
                const url = await fetchUnsplashImage(query);
                return { id: t.id || t.Id, url };
              })
            ).then((results) => {
              if (!active) return;
              const updates: Record<string, string> = {};
              results.forEach(({ id, url }) => { if (url) updates[id] = url; });
              if (Object.keys(updates).length > 0) setPublicTripImages(prev => ({ ...prev, ...updates }));
            });
          }
        }
      } catch (err: any) {
        if (active) {
          console.error('[Home] fetch public trips failed', err);
          setPublicError(err?.response?.data?.message || 'Failed to load public trips');
        }
      } finally {
        if (active) setLoadingPublic(false);
      }
    };
    fetchPublic();
    return () => { active = false; };
  }, [authToken, authLoading]);

  useEffect(() => {
    if (authLoading) return; // auth still resolving
    if (!authToken) { setUserTripsLoading(false); return; }
    let active = true;
    const fetchUserTrips = async () => {
      setUserTripsLoading(true);
      setUserTripsError(null);
      try {
        const resp = await apiServices.getDashboardTrips(authToken);
        if (!active) return;
        const trips = Array.isArray(resp?.data) ? resp.data : [];
        setUserTrips(trips);
      } catch (err: any) {
        if (!active) return;
        console.error('[Home] fetch user trips failed', err);
        setUserTrips([]);
        setUserTripsError(err?.response?.data?.message || 'Failed to load your trips');
      } finally {
        if (active) setUserTripsLoading(false);
      }
    };
    fetchUserTrips();
    return () => { active = false; };
  }, [authToken, authLoading]);

  // User profile from store
  const userProfile = useSelector((state: any) => state.user?.profile);
  const userFirstName = userProfile?.fname || userProfile?.email?.split('@')[0] || 'Explorer';

  const homeCountryRaw = userProfile?.location || userProfile?.country || null;

  const tripGeography = React.useMemo(() => {
    const visitedNamesSet = new Set<string>();
    const plannedNamesSet = new Set<string>();
    const upcomingNamesSet = new Set<string>();
    const visitedAlpha3Set = new Set<string>();
    const plannedAlpha3Set = new Set<string>();
    const upcomingAlpha3Set = new Set<string>();

    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

    const parseDate = (value: any): number => {
      if (!value) return Number.NaN;
      if (typeof value === 'number') return value;
      if (value instanceof Date) return value.getTime();
      const str = typeof value === 'string' ? value : value?.toString?.();
      if (!str) return Number.NaN;
      const normalized = str.length >= 10 ? str.slice(0, 10) : str;
      const ts = Date.parse(normalized);
      return Number.isNaN(ts) ? Number.NaN : ts;
    };

    const toTitleCase = (value: string): string => value.split(/\s+/).map(word => word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : '').join(' ').trim();

    const resolveDisplayName = (input: string): string => {
      const trimmed = input.trim();
      if (!trimmed) return trimmed;
      const upper = trimmed.toUpperCase();
      const direct = countryNameFromCode(upper);
      if (direct) return direct;
      const titleGuess = toTitleCase(trimmed);
      const iso2 = countryCodeFromName(titleGuess);
      if (iso2) {
        const mapped = countryNameFromCode(iso2);
        if (mapped) return mapped;
      }
      return titleGuess || upper;
    };

    const resolveAlpha3 = (rawInput: string, displayName: string): string | undefined => {
      const codeCandidate = countryAlpha3FromCode(rawInput) || countryAlpha3FromName(displayName);
      if (codeCandidate && codeCandidate.length === 3) return codeCandidate.toUpperCase();
      return undefined;
    };

    const unwrapTrip = (raw: any) => (raw?.trip && typeof raw.trip === 'object') ? raw.trip : raw;

    userTrips.forEach((rawTrip) => {
      const trip = unwrapTrip(rawTrip);
      if (!trip) return;
      const countriesSource = trip?.countries ?? rawTrip?.countries ?? [];
      const countries = Array.isArray(countriesSource) ? countriesSource : [];
      if (!countries.length) return;

      const startMs = parseDate(trip?.startDate ?? rawTrip?.startDate ?? rawTrip?.StartDate);
      const endMs = parseDate(trip?.endDate ?? rawTrip?.endDate ?? rawTrip?.EndDate);
      const statusRaw = (trip?.status ?? rawTrip?.status ?? '').toString().toUpperCase();

      let bucket: 'visited' | 'planned' | 'upcoming' = 'planned';
      if (!Number.isNaN(endMs) && endMs < todayMidnight) bucket = 'visited';
      else if (!Number.isNaN(startMs) && startMs > todayMidnight) bucket = 'upcoming';
      else if (statusRaw === 'COMPLETED') bucket = 'visited';
      else if (statusRaw === 'UPCOMING') bucket = 'upcoming';

      countries.forEach((countryValue: any) => {
        if (countryValue == null) return;
        const raw = String(countryValue).trim();
        if (!raw) return;
        const displayName = resolveDisplayName(raw);
        const alpha3 = resolveAlpha3(raw, displayName);
        if (bucket === 'visited') {
          visitedNamesSet.add(displayName);
          if (alpha3) visitedAlpha3Set.add(alpha3);
        } else if (bucket === 'upcoming') {
          upcomingNamesSet.add(displayName);
          if (alpha3) upcomingAlpha3Set.add(alpha3);
        } else {
          plannedNamesSet.add(displayName);
          if (alpha3) plannedAlpha3Set.add(alpha3);
        }
      });
    });

    return {
      visitedNames: Array.from(visitedNamesSet),
      plannedNames: Array.from(plannedNamesSet),
      upcomingNames: Array.from(upcomingNamesSet),
      visitedAlpha3: Array.from(visitedAlpha3Set),
      plannedAlpha3: Array.from(plannedAlpha3Set),
      upcomingAlpha3: Array.from(upcomingAlpha3Set),
    };
  }, [userTrips]);

  const { visitedNames, plannedNames, upcomingNames } = tripGeography;

  const nextDestinationName = upcomingNames[0] || plannedNames[0] || visitedNames[0];
  const nextDestinationLabel = nextDestinationName ?? 'somewhere new';
  const visitedCount = visitedNames.length;
  const plannedCount = plannedNames.length;
  const upcomingCount = upcomingNames.length;

  // Next future-dated trip (strictly after today)
  const nextUpcomingTrip = React.useMemo(() => {
    const today = Date.now();
    const unwrap = (raw: any) => (raw?.trip && typeof raw.trip === 'object') ? raw.trip : raw;
    const candidates = userTrips
      .map((rawTrip) => {
        const trip = unwrap(rawTrip);
        const startRaw = trip?.startDate ?? rawTrip?.startDate ?? rawTrip?.StartDate;
        if (!startRaw) return null;
        const str = typeof startRaw === 'string' ? startRaw : String(startRaw);
        const ms = Date.parse(str.length >= 10 ? str.slice(0, 10) : str);
        const id = trip?.id ?? trip?.Id ?? rawTrip?.id ?? rawTrip?.Id;
        if (!id || Number.isNaN(ms) || ms <= today) return null;
        const title = trip?.name ?? trip?.title ?? rawTrip?.name ?? rawTrip?.title ?? 'Your trip';
        return { startMs: ms, id: String(id), title };
      })
      .filter(Boolean) as { startMs: number; id: string; title: string }[];
    if (!candidates.length) return null;
    candidates.sort((a, b) => a.startMs - b.startMs);
    return candidates[0];
  }, [userTrips]);

  const handlePrimaryTripAction = () => {
    if (nextUpcomingTrip?.id) {
      navigate(`/tripplanner/${nextUpcomingTrip.id}`);
      return;
    }
    if (userTrips.length > 0) {
      navigate('/dashboard');
      return;
    }
    openCreateTrip();
  };

  const motivationalQuotes = React.useMemo(() => ([
    `"The world is waiting — one trip at a time."`,
    `"Adventure begins where comfort ends."`,
    `"Travel far enough, you meet yourself."`,
    `"Collect memories, not things."`,
    `"Explore the unseen, embrace the unknown."`,
    `"Life is short and the world is wide."`,
    `"Wander often, wonder always."`,
    `"Travel is the only thing you buy that makes you richer."`,
    `"Journeys are best measured in friends, not miles."`,
    `"Let the adventure change you."`
  ]), []);

  // Stable daily travel fact (changes each calendar day)
  const travelFact = React.useMemo(() => {
    const dayIndex = Math.floor(Date.now() / 86400000) % TRAVEL_FACTS.length;
    return TRAVEL_FACTS[dayIndex];
  }, []);

  // Days until next trip
  const daysUntilTrip = React.useMemo(() => {
    if (!nextUpcomingTrip) return null;
    return Math.max(0, Math.ceil((nextUpcomingTrip.startMs - Date.now()) / 86400000));
  }, [nextUpcomingTrip]);

  const statusMessages = React.useMemo(() => {
    if (!visitedCount && !plannedCount && !upcomingCount) {
      return [
        {
          title: 'Welcome to Tripician! Your journey starts today.',
          subtitle: "Plan your first getaway to unlock personalized insights."
        },
        {
          title: 'Ready for your first adventure?',
          subtitle: "Tap 'Start Planning a new trip' to map out your dream escape."
        },
        {
          title: 'Your travel story is waiting to be written.',
          subtitle: 'Add a destination to see live stats, maps, and inspiration tailored to you.'
        }
      ];
    }

    const messages = [
      {
        title: `Your adventure is calling… and it begins in ${nextDestinationLabel}.`,
        subtitle: "Let's make this one unforgettable."
      },
      {
        title: `Exciting journeys await! Your next stop: ${nextDestinationLabel}.`,
        subtitle: "Get ready to explore the unknown."
      },
      {
        title: `Upcoming destination: ${nextDestinationLabel}. Are you packed yet?`,
        subtitle: 'Time to make memories.'
      },
      {
        title: `Ready for new horizons? Next destination: ${nextDestinationLabel}.`,
        subtitle: 'Make every trip count.'
      }
    ];

    if (visitedCount) {
      messages.push(
        {
          title: `You are a traveloholic, you already have explored ${visitedCount} countries.`,
          subtitle: 'Keep your passport ready!'
        },
        {
          title: `The world is your playground — ${visitedCount} countries down and many more to go!`,
          subtitle: 'Adventure is out there!'
        },
        {
          title: `You've conquered ${visitedCount} countries already!`,
          subtitle: 'And many more await your footsteps.'
        }
      );
    }

    if (plannedCount) {
      messages.push(
        {
          title: `You are a great travel planner, more than ${plannedCount} trips lined up!`,
          subtitle: 'Plan smart, travel far.'
        },
        {
          title: `Your travel diary is growing with ${plannedCount} planned trips!`,
          subtitle: "Let's make them epic."
        },
        {
          title: `Your travel streak is unstoppable — ${plannedCount} trips in pipeline!`,
          subtitle: 'Adventure awaits!'
        }
      );
    }

    return messages;
  }, [nextDestinationLabel, visitedCount, plannedCount, upcomingCount]);

  const [, setCurrentStatusMessages] = useState(() => statusMessages[0] ?? { title: '', subtitle: '' });
  const [currentMotivation, setCurrentMotivation] = useState(() => ({ title: motivationalQuotes[0] }));

  /* ── Feed filter state ── */
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('All');

  /* Happening Now uses real public trips only */
  const happeningTrips = useMemo(() => {
    const activeCategory = feedFilter !== 'All' ? feedFilter : null;
    const base = [...publicTrips];

    if (activeCategory) {
      const filtered = base.filter((t: any) => {
        const tp = (t.travelPersonality || t.vibe || t.travelStyle || '').toLowerCase();
        return tp.includes(activeCategory.toLowerCase());
      });
      return filtered.slice(0, 8);
    }

    return base.slice(0, 8);
  }, [publicTrips, feedFilter]);


  useEffect(() => {
    if (!statusMessages.length) return;
    const statusIndex = Math.floor(Math.random() * statusMessages.length);
    setCurrentStatusMessages(statusMessages[statusIndex]);

    const motivationIndex = Math.floor(Math.random() * motivationalQuotes.length);
    setCurrentMotivation({ title: motivationalQuotes[motivationIndex] });
  }, [statusMessages, motivationalQuotes]);

  useEffect(() => {
    if (userTripsLoading) return;
    if (!heroRef.current) return;
    const ctx = gsap.context(() => {
      gsap.to(heroRef.current, {
        y: 0, opacity: 1, duration: 0.85, ease: 'power4.out', delay: 0.05,
      });
    }, pageRef);
    return () => ctx.revert();
  }, [userTripsLoading]);

  return (
    <Box
      ref={pageRef}
      sx={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        overflow: 'hidden',
      }}
    >
      {/* Indian kala lotus — top-right page root, always visible */}
      <Box sx={{ display: { xs: 'none', md: 'block' }, position: 'absolute', top: -80, right: -80, zIndex: 0, pointerEvents: 'none' }}>
        <KalaLotus size={780} color="#FF6B8A" opacity={0.15} />
      </Box>

      {/* HERO SECTION */}
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 1, md: 2 }, pb: 2, position: 'relative', zIndex: 2 }}>

      {/* ── No upcoming trip: full discovery experience ── */}
      {userTripsLoading ? (
        <Box sx={{ height: { xs: 220, md: 260 }, borderRadius: '20px' }} />
      ) : !nextUpcomingTrip && (
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: { xs: 'column', lg: 'row' }, 
          position: 'relative', 
          pb: 6, 
          gap: 3, 
          zIndex: 2,
          mt: 1,
        }}>
          {/* LEFT CONTENT */}
          <Box sx={{ 
            flexGrow: 1, 
            width: '100%',
            overflow: 'auto' 
          }}>
            {/* ── VIBE HERO ────────────────────────────────────────── */}
            <QuickStartStrip userName={userFirstName} hasTrips={userTrips.length > 0} />

            {/* Community Adventures */}
            <Box sx={{ mt: 2, mb: 6 }}>
              {/* ── Section master header ── */}
              <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <Box>
                  <Typography sx={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 900,
                    fontSize: { xs: '1.55rem', md: '1.85rem' },
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                    background: 'linear-gradient(135deg, #111 40%, #555)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>Community Adventures</Typography>
                  <Typography sx={{ fontSize: '0.78rem', color: '#999', fontFamily: "'Inter', sans-serif", mt: 0.6, letterSpacing: '0.01em' }}>
                    Real trip plans from the Tripician community
                  </Typography>
                </Box>
                <Typography onClick={() => navigate('/community')} sx={{
                  fontSize: '0.78rem', fontWeight: 600, color: '#FF385C',
                  fontFamily: "'Inter', sans-serif", cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' },
                }}>Browse all →</Typography>
              </Box>

              {loadingPublic && (
                <PageLoader variant="inline" messages={['Discovering public trips…', 'Finding great adventures…', 'Loading community trips…']} />
              )}
              {publicError && !loadingPublic && (
                <Alert
                  severity="error"
                  sx={{
                    mb: 6,
                    display: "flex",
                    alignItems: "center",
                  }}
                  action={
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleLogout}
                      sx={{
                        bgcolor: "#FF385C",
                        borderRadius: "50px",
                        textTransform: "none",
                        fontWeight: 600,
                        "&:hover": {
                          bgcolor: "#e62e52",
                        },
                      }}
                    >
                      Log In
                    </Button>
                  }
                >
                  {publicError}
                </Alert>
              )}
              {!loadingPublic && !publicError && publicTrips.length === 0 && (
                <Typography variant="body2" color="text.secondary">No public trips yet.</Typography>
              )}

              {!loadingPublic && !publicError && publicTrips.length > 0 && (() => {
                const getCover = (t: typeof publicTrips[0]): string => {
                  if (typeof t.photoUrl === 'string' && t.photoUrl.trim()) return t.photoUrl;
                  const id = t.id || t.Id;
                  return (id && publicTripImages[id]) ? publicTripImages[id] : '';
                };
                const ownerToMember = (owner: unknown): { id: string; name: string; profilePic: string } => {
                  const o = (owner && typeof owner === 'object') ? owner as Record<string, any> : null;
                  const u = o?.user || o?.User || o || {};
                  const firstName = u.fname || u.firstName || u.FirstName || '';
                  const lastName = u.lname || u.lastName || u.LastName || '';
                  const rawName = u.name || u.Name || u.fullName || u.displayName ||
                    [firstName, lastName].filter(Boolean).join(' ').trim() ||
                    (u.email ? u.email.split('@')[0] : null) ||
                    (typeof owner === 'string' ? owner : 'Traveler');
                  const name = typeof rawName === 'string' && rawName
                    ? rawName.replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()).trim()
                    : 'Traveler';
                  const ownerId = String(u.id || u.Id || '');
                  const myId = String(userProfile?.id || '');
                  const picFromBackend = u.profilePic || u.ProfilePic ||
                    u.profilePicture || u.ProfilePicture || u.profilepicture ||
                    u.avatar || u.Avatar || u.photoUrl || '';
                  const profilePic = picFromBackend ||
                    (myId && ownerId === myId ? (userProfile?.profilepicture as string) || '' : '');
                  return { id: ownerId, name, profilePic };
                };

                const userId = userProfile?.id || userProfile?.email;
                // /api/trips/public already returns only publicly-visible trips — no need to filter again
                const recommended = publicTrips.slice(0, 3);
                const alsoCheckout = publicTrips.slice(3, 11);

                return (
                  <>
                    {/* ══ ROW 1: Tripician Recommended ══ */}
                    <Box sx={{ mb: 4 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Box sx={{
                          display: 'flex', alignItems: 'center', gap: 0.6,
                          px: 1.25, py: 0.45,
                          background: 'linear-gradient(135deg, #FF385C 0%, #D91A50 100%)',
                          borderRadius: '50px',
                          boxShadow: '0 4px 14px rgba(255,56,92,0.35)',
                        }}>
                          <VerifiedRoundedIcon sx={{ fontSize: 13, color: '#fff' }} />
                          <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: '#fff', letterSpacing: '0.1em', fontFamily: "'Inter', sans-serif" }}>
                            TRIPICIAN RECOMMENDED
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1, height: '1px', background: 'linear-gradient(to right, rgba(255,56,92,0.15), transparent)' }} />
                      </Box>

                      <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(5, 1fr)' },
                        gap: 2,
                      }}>
                        {recommended.map((t, _tIdx) => {
                          const coverImg = getCover(t);
                          const tripName = t.name || t.title || 'Untitled Trip';
                          const countriesList: string[] = Array.isArray(t.countries) ? t.countries : [];
                          const ownerMember = ownerToMember(t.owner);

                          return (
                            <Box key={t.id || t.Id}>
                              <TripCard
                                title={tripName}
                                image={coverImg}
                                description={t.description || t.vibe || undefined}
                                countries={countriesList}
                                members={[ownerMember]}
                                onClick={() => navigate(`/trip/${t.id || t.Id}`)}
                              />
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>

                    {/* ══ ROW 2: Also Check Out ══ */}
                    {alsoCheckout.length > 0 && (
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <Box sx={{
                            display: 'flex', alignItems: 'center', gap: 0.6,
                            px: 1.25, py: 0.45,
                            background: '#F5F5F5',
                            border: '1px solid rgba(0,0,0,0.08)',
                            borderRadius: '50px',
                          }}>
                            <ExploreIcon sx={{ fontSize: 13, color: '#555' }} />
                            <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: '#555', letterSpacing: '0.1em', fontFamily: "'Inter', sans-serif" }}>
                              ALSO CHECK OUT
                            </Typography>
                          </Box>
                          <Box sx={{ flex: 1, height: '1px', background: 'rgba(0,0,0,0.07)' }} />
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 1.5, overflow: 'hidden' }}>
                          {alsoCheckout.map((t, _tIdx) => {
                            const coverImg = getCover(t);
                            const tripName = t.name || t.title || 'Untitled Trip';
                            const countriesList: string[] = Array.isArray(t.countries) ? t.countries : [];
                            const ownerMember = ownerToMember(t.owner);
                            const isOwner = t.owner && userId && t.owner === userId;
                            const isMember = Array.isArray(t.members) && userId && t.members.includes(userId);

                            return (
                              <Box
                                key={t.id || t.Id}
                                onClick={() => navigate(`/trip/${t.id || t.Id}`)}
                                sx={{
                                  position: 'relative',
                                  borderRadius: '14px',
                                  overflow: 'hidden',
                                  cursor: 'pointer',
                                  aspectRatio: '4 / 3',
                                  boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
                                  transition: 'transform 0.26s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.26s ease',
                                  '&:hover': { transform: 'translateY(-4px) scale(1.01)', boxShadow: '0 10px 28px rgba(0,0,0,0.16)' },
                                  '&:hover .co-img': { transform: 'scale(1.06)' },
                                }}
                              >
                                {coverImg ? (
                                  <Box
                                    className="co-img"
                                    component="img"
                                    src={coverImg}
                                    alt={tripName}
                                    sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                                  />
                                ) : (
                                  <Box className="co-img" sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg, #1c1c2e 0%, #2d1b3d 40%, #1a2a40 100%)', transition: 'transform 0.5s ease' }} />
                                )}

                                <Box sx={{
                                  position: 'absolute', inset: 0,
                                  background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)',
                                }} />

                                {(isOwner || isMember) && (
                                  <Box
                                    onClick={e => { e.stopPropagation(); navigate(`/trip/${t.id || t.Id}/edit`); }}
                                    sx={{
                                      position: 'absolute', top: 10, right: 10,
                                      width: 28, height: 28, borderRadius: '50%',
                                      backdropFilter: 'blur(8px)',
                                      background: 'rgba(255,255,255,0.22)',
                                      border: '1px solid rgba(255,255,255,0.35)',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      '&:hover': { background: '#FF385C', border: 'none' },
                                      transition: 'all 0.18s',
                                    }}
                                  >
                                    <EditRoundedIcon sx={{ fontSize: 12, color: '#fff' }} />
                                  </Box>
                                )}

                                <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: '12px 14px' }}>
                                  {countriesList.length > 0 && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mb: 0.5 }}>
                                      <PlaceRoundedIcon sx={{ fontSize: 10, color: '#FF385C' }} />
                                      <Typography sx={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.75)', fontFamily: "'Inter',sans-serif", fontWeight: 500, letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                                        {countriesList.join(' · ')}
                                      </Typography>
                                    </Box>
                                  )}
                                  <Typography sx={{
                                    fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.82rem',
                                    color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.3, mb: 0.4,
                                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                  }}>{tripName}</Typography>

                                  {(t.description || t.vibe) && (
                                    <Typography sx={{
                                      fontFamily: "'Inter',sans-serif", fontSize: '0.65rem', fontWeight: 400,
                                      color: 'rgba(255,255,255,0.65)', lineHeight: 1.4, mb: 0.8,
                                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                    }}>
                                      {t.description || t.vibe}
                                    </Typography>
                                  )}

                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                      <AlsoCheckoutAvatar member={ownerMember} />
                                      <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.75)', fontFamily: "'Inter',sans-serif", fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>{ownerMember.name}</Typography>
                                    </Box>
                                  </Box>
                                </Box>
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>
                    )}
                  </>
                );
              })()}
            </Box>

            {/* FEATURED DESTINATIONS */}
            <Box sx={{ pb: 6 }}>
              {/* Section header */}
              <Box sx={{ mb: 3.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 4, height: 22, borderRadius: 2, background: 'linear-gradient(180deg, #FF385C, #D91A50)' }} />
                  <Typography fontWeight={800} sx={{
                    fontFamily: "'Inter', sans-serif",
                    letterSpacing: '-0.03em',
                    fontSize: { xs: '1.3rem', md: '1.5rem' },
                    color: 'text.primary',
                  }}>
                    Trending Destinations
                  </Typography>
                </Box>
                <Typography onClick={() => navigate('/blog')} sx={{
                  fontSize: '0.78rem', fontWeight: 600, color: '#FF385C',
                  fontFamily: "'Inter', sans-serif", cursor: 'pointer',
                  letterSpacing: '0.01em',
                  '&:hover': { textDecoration: 'underline' },
                }}>View all →</Typography>
              </Box>

              {/* Cards grid */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2.5 }}>
                {featuredDestinations.map((destination) => (
                  <Box
                    key={destination.id}
                    onClick={() => navigate(`/blog/${(destination as any).slug}`)}
                    sx={{
                      position: 'relative',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      minHeight: { xs: 260, md: 320 },
                      boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
                      transition: 'transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.32s ease',
                      '&:hover': {
                        transform: 'translateY(-6px) scale(1.012)',
                        boxShadow: '0 20px 48px rgba(0,0,0,0.20)',
                      },
                      '&:hover .dest-overlay': { opacity: 1 },
                      '&:hover .dest-img': { transform: 'scale(1.06)' },
                    }}
                  >
                    {/* Image */}
                    {destination.image ? (
                      <Box
                        className="dest-img"
                        component="img"
                        src={destination.image}
                        alt={destination.title}
                        sx={{
                          width: '100%', height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                          transition: 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                        }}
                      />
                    ) : (
                      <Box className="dest-img" sx={{ width: '100%', height: '100%', background: 'linear-gradient(145deg, #1c1c2e 0%, #2d1b3d 40%, #1a2a40 100%)', transition: 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }} />
                    )}

                    {/* Permanent gradient overlay bottom */}
                    <Box sx={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.18) 45%, transparent 100%)',
                    }} />

                    {/* Hover tint overlay */}
                    <Box className="dest-overlay" sx={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(135deg, rgba(255,56,92,0.18) 0%, transparent 60%)',
                      opacity: 0, transition: 'opacity 0.3s ease',
                    }} />

                    {/* Badge top-right */}
                    <Box sx={{
                      position: 'absolute', top: 14, right: 14,
                      px: 1.25, py: 0.45,
                      background: 'rgba(255,255,255,0.92)',
                      backdropFilter: 'blur(12px)',
                      borderRadius: '50px',
                      fontSize: '0.7rem', fontWeight: 700,
                      fontFamily: "'Inter', sans-serif",
                      color: '#111',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.14)',
                      lineHeight: 1.4,
                    }}>
                      {destination.badge}
                    </Box>

                    {/* Vibe pill top-left */}
                    {(destination as any).vibe && (
                      <Box sx={{
                        position: 'absolute', top: 14, left: 14,
                        px: 1.1, py: 0.4,
                        background: 'rgba(0,0,0,0.50)',
                        backdropFilter: 'blur(8px)',
                        borderRadius: '50px',
                        border: '1px solid rgba(255,255,255,0.15)',
                        fontSize: '0.68rem', fontWeight: 600,
                        fontFamily: "'Inter', sans-serif",
                        color: 'rgba(255,255,255,0.9)',
                        lineHeight: 1.4,
                      }}>
                        {(destination as any).vibe}
                      </Box>
                    )}

                    {/* Text bottom */}
                    <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: '18px 20px 20px' }}>
                      <Typography sx={{
                        color: '#FFFFFF', fontWeight: 700,
                        fontSize: '1rem',
                        fontFamily: "'Inter', sans-serif",
                        lineHeight: 1.3, mb: 0.5,
                        letterSpacing: '-0.01em',
                      }}>
                        {destination.title}
                      </Typography>
                      <Typography sx={{
                        color: 'rgba(255,255,255,0.72)', fontSize: '0.72rem',
                        fontFamily: "'Inter', sans-serif",
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        mb: (destination as any).travelerCount ? 0.8 : 0,
                      }}>
                        {destination.description}
                      </Typography>
                      {(destination as any).travelerCount && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                          <Box sx={{ display: 'flex' }}>
                            {['#FF385C','#8B5CF6','#10B981'].map((c, idx) => (
                              <Box key={idx} sx={{
                                width: 18, height: 18, borderRadius: '50%',
                                border: '1.5px solid rgba(0,0,0,0.5)',
                                background: c,
                                ml: idx > 0 ? '-5px' : 0,
                              }} />
                            ))}
                          </Box>
                          <Typography sx={{ fontSize: '0.62rem', fontWeight: 600, color: 'rgba(255,255,255,0.72)', fontFamily: "'Inter', sans-serif" }}>
                            {(destination as any).travelerCount} travelers
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* CTA */}
            <Box sx={{
              textAlign: 'center',
              py: 8,
              px: { xs: 3, md: 6 },
              background: 'linear-gradient(145deg, #3d0014 0%, #1e0009 45%, #100005 100%)',
              borderRadius: 4,
              mb: 4,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                width: 400,
                height: 400,
                borderRadius: '50%',
                background: 'rgba(255,56,92,0.12)',
                filter: 'blur(80px)',
                top: -160,
                left: -120,
                pointerEvents: 'none',
              }
            }}>
              <Typography variant="h4" fontWeight={700} gutterBottom sx={{
                fontFamily: "'Playfair Display', serif",
                fontSize: { xs: '1.8rem', md: '2.4rem' },
                color: '#FFFFFF',
                letterSpacing: '-0.03em',
                position: 'relative',
                zIndex: 1,
              }}>
                Ready to Start Planning?
              </Typography>
              <Typography variant="body1" sx={{ mb: 4, color: 'rgba(255,255,255,0.58)', fontSize: { xs: '0.9rem', md: '1rem' }, position: 'relative', zIndex: 1 }}>
                Create your first trip and invite your friends.
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={handlePrimaryTripAction}
                sx={{
                  fontWeight: 700,
                  px: 5,
                  py: 1.6,
                  borderRadius: '50px',
                  textTransform: 'none',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '1rem',
                  background: '#FFFFFF',
                  color: '#222222',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                  position: 'relative',
                  zIndex: 1,
                  '&:hover': { background: 'rgba(255,255,255,0.92)', transform: 'translateY(-2px)', boxShadow: '0 16px 48px rgba(0,0,0,0.45)' },
                  transition: 'all 0.25s ease',
                }}
              >
                Get Started Free
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      {/* ── Has upcoming trip: Journey Dashboard Hero ── */}
      {!userTripsLoading && nextUpcomingTrip && (
        <>
        <Box
          ref={heroRef}
          className="gs-hero"
          style={{ opacity: 0, transform: 'translateY(32px)' }}
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1.55fr 1fr' },
            gap: { xs: 2, lg: 2.5 },
            mb: 0,
          }}
        >
          {/* ── LEFT: Dark hero panel ── */}
          <Box sx={{
            borderRadius: '20px',
            background: 'linear-gradient(160deg, #130006 0%, #220009 40%, #0d0004 100%)',
            p: { xs: '28px 24px', sm: '40px 44px' },
            display: 'flex',
            flexDirection: 'column',
            minHeight: { xs: 'auto', sm: 320 },
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Deep ambient glow — top right */}
            <Box sx={{
              position: 'absolute', top: -80, right: -80,
              width: 340, height: 340, borderRadius: '50%',
              background: 'rgba(255,56,92,0.11)', filter: 'blur(90px)',
              pointerEvents: 'none',
            }} />
            {/* Subtle bottom-left glow */}
            <Box sx={{
              position: 'absolute', bottom: -60, left: -40,
              width: 200, height: 200, borderRadius: '50%',
              background: 'rgba(180,0,60,0.07)', filter: 'blur(60px)',
              pointerEvents: 'none',
            }} />

            {/* Top row: label + welcome chip */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography sx={{
                fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.22em',
                color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase',
                fontFamily: "'Inter', sans-serif",
              }}>Your Journey Dashboard</Typography>
              <Box sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.6,
                px: 1.4, py: 0.5, borderRadius: '40px',
                border: '1px solid rgba(255,56,92,0.28)',
                background: 'rgba(255,56,92,0.08)',
              }}>
                <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#FF385C', boxShadow: '0 0 6px #FF385C' }} />
                <Typography sx={{
                  fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.14em',
                  color: '#FF385C', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif",
                }}>Welcome back, {userFirstName}</Typography>
              </Box>
            </Box>

            {/* Headline */}
            <Box sx={{ mb: 2 }}>
              <Typography sx={{
                fontFamily: "'Playfair Display', serif",
                fontSize: { xs: '2rem', sm: '2.6rem', md: '3rem' },
                fontWeight: 800, lineHeight: 1.1, color: '#fff',
                letterSpacing: '-0.025em',
              }}>Ready for your</Typography>
              <Typography sx={{
                fontFamily: "'Playfair Display', serif",
                fontSize: { xs: '2rem', sm: '2.6rem', md: '3rem' },
                fontWeight: 800, lineHeight: 1.1,
                background: 'linear-gradient(90deg, #FF385C 0%, #ff6b8a 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.025em', mb: 1.5,
              }}>next adventure?</Typography>
              <Typography sx={{
                fontSize: { xs: '0.82rem', sm: '0.9rem' },
                color: 'rgba(255,255,255,0.42)',
                fontFamily: "'Inter', sans-serif",
              }}>
                {upcomingCount} upcoming {upcomingCount === 1 ? 'journey' : 'journeys'}
                <Box component="span" sx={{ mx: 1, color: 'rgba(255,255,255,0.2)' }}>·</Box>
                {homeCountryRaw || 'Home'} → World
              </Typography>
            </Box>

            {/* Motivational quote */}
            <Box sx={{
              display: 'flex', alignItems: 'flex-start', gap: 1,
              mb: 3,
              borderLeft: '2px solid rgba(255,56,92,0.45)',
              pl: 1.5,
            }}>
              <Typography sx={{
                fontStyle: 'italic',
                fontSize: { xs: '0.78rem', sm: '0.84rem' },
                color: 'rgba(255,255,255,0.35)',
                fontFamily: "'Playfair Display', serif",
                lineHeight: 1.6,
              }}>{currentMotivation.title}</Typography>
            </Box>

            {/* Divider */}
            <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.08)', mb: 3 }} />

            {/* Next trip card */}
            <Box sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 2, flexWrap: 'wrap',
            }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.8 }}>
                  <FlightTakeoffIcon sx={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }} />
                  <Typography sx={{
                    fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.2em',
                    color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase',
                    fontFamily: "'Inter', sans-serif",
                  }}>Next Planned Trip</Typography>
                </Box>
                <Typography sx={{
                  fontSize: { xs: '1.1rem', sm: '1.3rem' }, fontWeight: 700,
                  fontFamily: "'Inter', sans-serif", color: '#fff',
                  letterSpacing: '-0.01em', mb: 0.4
                }}>
                  {nextDestinationLabel.toUpperCase()}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                  <CalendarMonthIcon sx={{ fontSize: 11, color: 'rgba(255,255,255,0.30)' }} />
                  <Typography sx={{
                    fontSize: '0.8rem', color: 'rgba(255,255,255,0.38)',
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    {new Date(nextUpcomingTrip!.startMs).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                onClick={handlePrimaryTripAction}
                endIcon={<FlightTakeoffIcon sx={{ fontSize: '0.9rem !important' }} />}
                sx={{
                  borderRadius: '50px', textTransform: 'none',
                  fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.82rem',
                  px: 2.5, py: 1,
                  background: 'linear-gradient(135deg, #FF385C, #D4104A)',
                  boxShadow: '0 4px 20px rgba(255,56,92,0.35)',
                  whiteSpace: 'nowrap',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #ff6b8a, #FF385C)',
                    boxShadow: '0 8px 28px rgba(255,56,92,0.50)',
                    transform: 'translateY(-1px)',
                  },
                  transition: 'all 0.22s ease',
                }}
              >
                Continue planning
              </Button>
            </Box>
          </Box>

          {/* ── RIGHT: Insights & Stats Panel ── */}
          <Box sx={{
            display: { xs: 'none', lg: 'flex' },
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 4,
          }}>
          {/* Subtle top-right accent */}
          <Box sx={{ position: 'absolute', top: -60, right: -60, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,56,92,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

            {/* ── SECTION: Travel Insight? (Full-height, Beautiful) ── */}
            {/* Premium Quote Hero */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              background: 'linear-gradient(135deg,#0B1020 0%,#1A1F3A 35%,#2E1A47 70%,#0F4C75 100%)',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              position: 'relative',              
              py:0,
            }}
          >
            <Box
              component="img"
              src="https://res.cloudinary.com/ddt3rcyhv/image/upload/v1780518395/asset001_cotcp8.png"
              alt="Quote"
              sx={{
                width: 150,
                height: 'auto',
                mb: 0,
                opacity: 0.9,
                userSelect: 'none',
                pointerEvents: 'none',
                mt:0
              }}
            />

            {/* Fact */}
            <Typography
              sx={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: {
                  xs: '1.4rem',
                  md: '1.8rem',
                },
                fontWeight: 600,
                color: '#ffffff',
                lineHeight: 1.6,
                maxWidth: '850px',
                textShadow: '0 3px 15px rgba(0,0,0,0.35)',
                mb: 3,
                ml: 2,
                mr: 2
              }}
            >
              {travelFact.fact}
            </Typography>

            {/* Source */}
            <Typography
              sx={{
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.18em',
                color: '#FFD700',
                textTransform: 'uppercase',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              ✦ {travelFact.source}
            </Typography>          
          </Box>

          

            {/* ── SECTION: Stats ── */}
            <Box sx={{
              border: '1px solid rgba(0,0,0,0.07)',
              background: 'rgb(255, 255, 255)',
              p: '20px 22px',
            }}>
              {/* Stat row */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
                {[
                  { value: visitedCount, label: 'Countries', icon: '🌍', sub: visitedCount >= 10 ? 'Globetrotter' : visitedCount > 0 ? 'Explorer' : 'Not yet' },
                  { value: plannedCount, label: 'Planned', icon: '📋', sub: plannedCount >= 5 ? 'Pro Planner' : plannedCount > 0 ? 'Building up' : 'Let\'s plan!' },
                  { value: daysUntilTrip ?? upcomingCount, label: daysUntilTrip != null ? 'Days Away' : 'Upcoming', icon: daysUntilTrip === 0 ? '🎉' : '✈️', sub: daysUntilTrip === 0 ? 'Today!' : daysUntilTrip != null ? `to ${nextDestinationLabel}` : upcomingCount > 0 ? 'Busy traveler' : 'None yet' },
                ].map((s, i) => (
                  <Box key={s.label} sx={{
                    textAlign: 'center',
                    px: 1.5,
                    py: 0.5,
                    borderRight: i < 2 ? '1px solid rgba(0,0,0,0.07)' : 'none',
                  }}>
                    {/* <Typography sx={{ fontSize: '1rem', lineHeight: 1, mb: 0.5 }}>{s.icon}</Typography> */}
                    <Typography sx={{ fontFamily: 'Roboto', fontSize: '3rem', fontWeight: 900, lineHeight: 1, color: '#FF385C', letterSpacing: '-0.04em' }}>{s.value}</Typography>
                    <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: 'text.primary', fontFamily: "'Inter', sans-serif", mt: 0.4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{s.label}</Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled', fontFamily: "'Inter', sans-serif", mt: 0.15 }}>{s.sub}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
        </>
      )}

      </Box>

      {/* MAIN BODY — users with upcoming trip still see community content */}
      {!userTripsLoading && nextUpcomingTrip && (
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: { xs: 'column', lg: 'row' }, 
        position: 'relative', 
        px: { xs: 2, sm: 3, md: 4 }, 
        pb: 6, 
        gap: 3, 
        zIndex: 2 
      }}>
        {/* LEFT CONTENT */}
        <Box sx={{ 
          flexGrow: 1, 
          width: '100%',
          overflow: 'auto' 
        }}>          

          {/* Community Adventures */}
          <Box sx={{ mt: 2, mb: 6 }}>

            {/* ── Section master header ── */}
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <Box>
                <Typography sx={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 900,
                  fontSize: { xs: '1.55rem', md: '1.85rem' },
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                  background: 'linear-gradient(135deg, #111 40%, #555)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>Community Adventures</Typography>
                <Typography sx={{ fontSize: '0.78rem', color: '#999', fontFamily: "'Inter', sans-serif", mt: 0.6, letterSpacing: '0.01em' }}>
                  Real trip plans from the Tripician community
                </Typography>
              </Box>
              <Typography onClick={() => navigate('/community')} sx={{
                fontSize: '0.78rem', fontWeight: 600, color: '#FF385C',
                fontFamily: "'Inter', sans-serif", cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' },
              }}>Browse all →</Typography>
            </Box>

            {loadingPublic && (
              <PageLoader variant="inline" messages={['Discovering public trips…', 'Finding great adventures…', 'Loading community trips…']} />
            )}
            {publicError && !loadingPublic && <Alert
                  severity="error"
                  sx={{
                    mb: 6,
                    display: "flex",
                    alignItems: "center",
                  }}
                  action={
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleLogout}
                      sx={{
                        bgcolor: "#FF385C",
                        borderRadius: "50px",
                        textTransform: "none",
                        fontWeight: 600,
                        "&:hover": {
                          bgcolor: "#e62e52",
                        },
                      }}
                    >
                      Log In
                    </Button>
                  }
                >
                  {publicError}
                </Alert>}
            {!loadingPublic && !publicError && publicTrips.length === 0 && (
              <Typography variant="body2" color="text.secondary">No public trips yet.</Typography>
            )}

            {!loadingPublic && !publicError && publicTrips.length > 0 && (() => {
              // Helper: resolve cover image for a trip (user-uploaded first, then Unsplash, then empty)
              const getCover = (t: typeof publicTrips[0]): string => {
                if (typeof t.photoUrl === 'string' && t.photoUrl.trim()) return t.photoUrl;
                const id = t.id || t.Id;
                return (id && publicTripImages[id]) ? publicTripImages[id] : '';
              };
              // Helper: normalise owner (string | object) into a members-shaped entry
              const ownerToMember = (owner: unknown): { id: string; name: string; profilePic: string } => {
                const o = (owner && typeof owner === 'object') ? owner as Record<string, any> : null;
                const u = o?.user || o?.User || o || {};
                const firstName = u.fname || u.firstName || u.FirstName || '';
                const lastName = u.lname || u.lastName || u.LastName || '';
                const rawName = u.name || u.Name || u.fullName || u.displayName ||
                  [firstName, lastName].filter(Boolean).join(' ').trim() ||
                  (u.email ? u.email.split('@')[0] : null) ||
                  (typeof owner === 'string' ? owner : 'Traveler');
                const name = typeof rawName === 'string' && rawName
                  ? rawName.replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()).trim()
                  : 'Traveler';
                const ownerId = String(u.id || u.Id || '');
                const myId = String(userProfile?.id || '');
                const picFromBackend = u.profilePic || u.ProfilePic ||
                  u.profilePicture || u.ProfilePicture || u.profilepicture ||
                  u.avatar || u.Avatar || u.photoUrl || '';
                // Fall back to Redux profile pic when the owner is the logged-in user and backend omits the URL
                const profilePic = picFromBackend ||
                  (myId && ownerId === myId ? (userProfile?.profilepicture as string) || '' : '');
                return { id: ownerId, name, profilePic };
              };

              const userId = userProfile?.id || userProfile?.email;
              // /api/trips/public already returns only publicly-visible trips — no need to filter again
              const recommended = publicTrips.slice(0, 3);
              const alsoCheckout = publicTrips.slice(3, 11);

              return (
                <>
                  {/* ══ ROW 1: Tripician Recommended ══ */}
                  <Box sx={{ mb: 4 }}>
                    {/* Row label */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Box sx={{
                        display: 'flex', alignItems: 'center', gap: 0.6,
                        px: 1.25, py: 0.45,
                        background: 'linear-gradient(135deg, #FF385C 0%, #D91A50 100%)',
                        borderRadius: '50px',
                        boxShadow: '0 4px 14px rgba(255,56,92,0.35)',
                      }}>
                        <VerifiedRoundedIcon sx={{ fontSize: 13, color: '#fff' }} />
                        <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: '#fff', letterSpacing: '0.1em', fontFamily: "'Inter', sans-serif" }}>
                          TRIPICIAN RECOMMENDED
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1, height: '1px', background: 'linear-gradient(to right, rgba(255,56,92,0.15), transparent)' }} />
                    </Box>

                    {/* Uniform grid — matches dashboard 5-col layout */}
                    <Box sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(5, 1fr)' },
                      gap: 2,
                    }}>
                      {recommended.map((t, _tIdx) => {
                        const coverImg = getCover(t);
                        const tripName = t.name || t.title || 'Untitled Trip';
                        const countriesList: string[] = Array.isArray(t.countries) ? t.countries : [];
                        const ownerMember = ownerToMember(t.owner);

                        return (
                          <Box key={t.id || t.Id}>
                            <TripCard
                              title={tripName}
                              image={coverImg}
                              description={t.description || t.vibe || undefined}
                              countries={countriesList}
                              members={[ownerMember]}
                              onClick={() => navigate(`/trip/${t.id || t.Id}`)}
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>

                  {/* ══ ROW 2: Also Check Out ══ */}
                  {alsoCheckout.length > 0 && (
                    <Box>
                      {/* Row label */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Box sx={{
                          display: 'flex', alignItems: 'center', gap: 0.6,
                          px: 1.25, py: 0.45,
                          background: '#F5F5F5',
                          border: '1px solid rgba(0,0,0,0.08)',
                          borderRadius: '50px',
                        }}>
                          <ExploreIcon sx={{ fontSize: 13, color: '#555' }} />
                          <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: '#555', letterSpacing: '0.1em', fontFamily: "'Inter', sans-serif" }}>
                            ALSO CHECK OUT
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1, height: '1px', background: 'rgba(0,0,0,0.07)' }} />
                      </Box>

                      {/* Compact horizontal cards grid */}
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 1.5, overflow: 'hidden' }}>
                        {alsoCheckout.map((t, _tIdx) => {
                          const coverImg = getCover(t);
                          const tripName = t.name || t.title || 'Untitled Trip';
                          const countriesList: string[] = Array.isArray(t.countries) ? t.countries : [];
                          const ownerMember = ownerToMember(t.owner);
                          const isOwner = t.owner && userId && t.owner === userId;
                          const isMember = Array.isArray(t.members) && userId && t.members.includes(userId);

                          return (
                            <Box
                              key={t.id || t.Id}
                              onClick={() => navigate(`/trip/${t.id || t.Id}`)}
                              sx={{
                                position: 'relative',
                                borderRadius: '14px',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                aspectRatio: '4 / 3',
                                boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
                                transition: 'transform 0.26s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.26s ease',
                                '&:hover': { transform: 'translateY(-4px) scale(1.01)', boxShadow: '0 10px 28px rgba(0,0,0,0.16)' },
                                '&:hover .co-img': { transform: 'scale(1.06)' },
                              }}
                            >
                              {/* Cover photo */}
                              {coverImg ? (
                                <Box
                                  className="co-img"
                                  component="img"
                                  src={coverImg}
                                  alt={tripName}
                                  sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                                />
                              ) : (
                                <Box className="co-img" sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg, #1c1c2e 0%, #2d1b3d 40%, #1a2a40 100%)', transition: 'transform 0.5s ease' }} />
                              )}

                              {/* Gradient overlay */}
                              <Box sx={{
                                position: 'absolute', inset: 0,
                                background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)',
                              }} />

                              {/* Edit badge */}
                              {(isOwner || isMember) && (
                                <Box
                                  onClick={e => { e.stopPropagation(); navigate(`/trip/${t.id || t.Id}/edit`); }}
                                  sx={{
                                    position: 'absolute', top: 10, right: 10,
                                    width: 28, height: 28, borderRadius: '50%',
                                    backdropFilter: 'blur(8px)',
                                    background: 'rgba(255,255,255,0.22)',
                                    border: '1px solid rgba(255,255,255,0.35)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    '&:hover': { background: '#FF385C', border: 'none' },
                                    transition: 'all 0.18s',
                                  }}
                                >
                                  <EditRoundedIcon sx={{ fontSize: 12, color: '#fff' }} />
                                </Box>
                              )}

                              {/* Bottom info */}
                              <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: '12px 14px' }}>
                                {countriesList.length > 0 && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mb: 0.5 }}>
                                    <PlaceRoundedIcon sx={{ fontSize: 10, color: '#FF385C' }} />
                                    <Typography sx={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.75)', fontFamily: "'Inter',sans-serif", fontWeight: 500, letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                                      {countriesList.join(' · ')}
                                    </Typography>
                                  </Box>
                                )}
                                <Typography sx={{
                                  fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.82rem',
                                  color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.3, mb: 0.4,
                                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                }}>{tripName}</Typography>

                                {(t.description || t.vibe) && (
                                  <Typography sx={{
                                    fontFamily: "'Inter',sans-serif", fontSize: '0.65rem', fontWeight: 400,
                                    color: 'rgba(255,255,255,0.65)', lineHeight: 1.4, mb: 0.8,
                                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                  }}>
                                    {t.description || t.vibe}
                                  </Typography>
                                )}

                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                    <AlsoCheckoutAvatar member={ownerMember} />
                                    <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.75)', fontFamily: "'Inter',sans-serif", fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>{ownerMember.name}</Typography>
                                  </Box>
                                </Box>
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  )}
                </>
              );
            })()}
          </Box>

          {/* FEATURED DESTINATIONS */}
          <Box sx={{ pb: 6 }}>
            {/* Section header */}
            <Box sx={{ mb: 3.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 4, height: 22, borderRadius: 2, background: 'linear-gradient(180deg, #FF385C, #D91A50)' }} />
                <Typography fontWeight={800} sx={{
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: '-0.03em',
                  fontSize: { xs: '1.3rem', md: '1.5rem' },
                  color: 'text.primary',
                }}>
                  Trending Destinations
                </Typography>
              </Box>
              <Typography onClick={() => navigate('/blog')} sx={
                {
                fontSize: '0.78rem', fontWeight: 600, color: '#FF385C',
                fontFamily: "'Inter', sans-serif", cursor: 'pointer',
                letterSpacing: '0.01em',
                '&:hover': { textDecoration: 'underline' },
              }}>View all →</Typography>
            </Box>

            {/* Cards grid */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2.5 }}>
              {featuredDestinations.map((destination) => (
                <Box
                  key={destination.id}
                  onClick={() => navigate(`/blog/${(destination as any).slug}`)}
                  sx={{
                    position: 'relative',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    minHeight: { xs: 260, md: 320 },
                    boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
                    transition: 'transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.32s ease',
                    '&:hover': {
                      transform: 'translateY(-6px) scale(1.012)',
                      boxShadow: '0 20px 48px rgba(0,0,0,0.20)',
                    },
                    '&:hover .dest-overlay': { opacity: 1 },
                    '&:hover .dest-img': { transform: 'scale(1.06)' },
                  }}
                >
                  {/* Image */}
                  {destination.image ? (
                    <Box
                      className="dest-img"
                      component="img"
                      src={destination.image}
                      alt={destination.title}
                      sx={{
                        width: '100%', height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                        transition: 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                      }}
                    />
                  ) : (
                    <Box className="dest-img" sx={{ width: '100%', height: '100%', background: 'linear-gradient(145deg, #1c1c2e 0%, #2d1b3d 40%, #1a2a40 100%)', transition: 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }} />
                  )}

                  {/* Permanent gradient overlay bottom */}
                  <Box sx={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.18) 45%, transparent 100%)',
                  }} />

                  {/* Hover tint overlay */}
                  <Box className="dest-overlay" sx={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(135deg, rgba(255,56,92,0.18) 0%, transparent 60%)',
                    opacity: 0, transition: 'opacity 0.3s ease',
                  }} />

                  {/* Badge top-right */}
                  <Box sx={{
                    position: 'absolute', top: 14, right: 14,
                    px: 1.25, py: 0.45,
                    background: 'rgba(255,255,255,0.92)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: '50px',
                    fontSize: '0.7rem', fontWeight: 700,
                    fontFamily: "'Inter', sans-serif",
                    color: '#111',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.14)',
                    lineHeight: 1.4,
                  }}>
                    {destination.badge}
                  </Box>

                  {/* Text bottom */}
                  <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: '18px 20px 20px' }}>
                    <Typography sx={{
                      color: '#FFFFFF', fontWeight: 700,
                      fontSize: '1rem',
                      fontFamily: "'Inter', sans-serif",
                      lineHeight: 1.3, mb: 0.5,
                      letterSpacing: '-0.01em',
                    }}>
                      {destination.title}
                    </Typography>
                    <Typography sx={{
                      color: 'rgba(255,255,255,0.72)', fontSize: '0.72rem',
                      fontFamily: "'Inter', sans-serif",
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {destination.description}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

          {/* CTA */}
          <Box sx={{
            textAlign: 'center',
            py: 8,
            px: { xs: 3, md: 6 },
            background: 'linear-gradient(145deg, #3d0014 0%, #1e0009 45%, #100005 100%)',
            borderRadius: 4,
            mb: 4,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              width: 400,
              height: 400,
              borderRadius: '50%',
              background: 'rgba(255,56,92,0.12)',
              filter: 'blur(80px)',
              top: -160,
              left: -120,
              pointerEvents: 'none',
            }
          }}>
            <Typography variant="h4" fontWeight={700} gutterBottom sx={{
              fontFamily: "'Playfair Display', serif",
              fontSize: { xs: "1.8rem", md: "2.4rem" },
              color: '#FFFFFF',
              letterSpacing: '-0.03em',
              position: 'relative',
              zIndex: 1,
            }}>
              Ready to Start Planning?
            </Typography>
            <Typography variant="body1" sx={{ mb: 4, color: 'rgba(255,255,255,0.58)', fontSize: { xs: "0.9rem", md: "1rem" }, position: 'relative', zIndex: 1 }}>
              Create your first trip and invite your friends.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={handlePrimaryTripAction}
              sx={{
                fontWeight: 700,
                px: 5,
                py: 1.6,
                borderRadius: '50px',
                textTransform: 'none',
                fontFamily: "'Inter', sans-serif",
                fontSize: '1rem',
                background: '#FFFFFF',
                color: '#222222',
                boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                position: 'relative',
                zIndex: 1,
                '&:hover': { background: 'rgba(255,255,255,0.92)', transform: 'translateY(-2px)', boxShadow: '0 16px 48px rgba(0,0,0,0.45)' },
                transition: 'all 0.25s ease',
              }}
            >
              Get Started Free
            </Button>
          </Box>
        </Box>
      </Box>
      )}
    </Box>
  );
};

export default Home;
