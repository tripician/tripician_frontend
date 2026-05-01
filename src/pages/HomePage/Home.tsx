import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Button, CircularProgress, Alert, Stack, Skeleton } from '@mui/material';
import { KalaLotus } from '../../components/DecorativeComponents/KalaDecor';
import { useSelector } from 'react-redux';
import ExploreIcon from '@mui/icons-material/TravelExplore';
import PublicIcon from '@mui/icons-material/Public';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';

import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ConnectingAirportsIcon from '@mui/icons-material/ConnectingAirports';
import TopBar from '../PageLayout/CommonLayouts/TopBar';
import { useNavigate } from 'react-router-dom';
import { apiServices } from '../../services/APIs/apiServices';
import { fetchUnsplashImage } from '../../services/unsplashService';
import TripCreationModal from '../../components/CreateTripComponents/TripCreationModal';
import TripCard from '../DashboardPage/TripCard';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { countryAlpha3FromCode, countryAlpha3FromName, countryNameFromCode, countryCodeFromName } from '../../utils/countryFlags';
import Barcode from 'react-barcode';
import iconArchitecture from '../../assets/icons/architecture.png';
import iconBeaches from '../../assets/icons/beaches.png';
import iconCity from '../../assets/icons/city.png';
import iconForest from '../../assets/icons/forest.png';
import iconMountains from '../../assets/icons/mountains.png';
import gsap from 'gsap';
import blogsData from '../../assets/blogs/blogs.json';

const FEATURED_DESTINATIONS_BASE = blogsData.slice(0, 4).map(b => ({
  id: b.id,
  title: `${b.city}, ${b.country}`,
  query: `${b.city} ${b.country}`,
  description: b.description,
  trending: true,
  badge: b.badge,
  slug: b.slug,
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

  const pageRef      = useRef<HTMLDivElement>(null);
  const heroRef      = useRef<HTMLDivElement>(null);

  const [featuredImages, setFeaturedImages] = useState<Record<number, string>>({});
  const featuredDestinations = FEATURED_DESTINATIONS_BASE.map(d => ({ ...d, image: featuredImages[d.id] || '' }));

  const [publicTrips, setPublicTrips] = useState<any[]>([]);
  const [publicTripImages, setPublicTripImages] = useState<Record<string, string>>({});
  const [loadingPublic, setLoadingPublic] = useState(false);
  const [publicError, setPublicError] = useState<string | null>(null);
  const [createTripOpen, setCreateTripOpen] = useState(false);
  const { token: authToken, loading: authLoading } = useAuthToken();
  const [userTrips, setUserTrips] = useState<any[]>([]);
  const [userTripsLoading, setUserTripsLoading] = useState(true);
  const [, setUserTripsError] = useState<string | null>(null);

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
      setLoadingPublic(true);
      try {
        const response = await apiServices.getPublicTrips();
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
  }, []);

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

  const handleExploreTrips = () => {
    setCreateTripOpen(true);
  };

  const handleExploreDashboard = () => {
    navigate('/dashboard');
  }

  // User profile from store
  const userProfile = useSelector((state: any) => state.user?.profile);
  const userFirstName = userProfile?.fname || userProfile?.email?.split('@')[0] || 'Explorer';

  // Derive a 3-letter IATA-style code from the user's current location (set in Profile Settings)
  // Falls back to country, then a placeholder
  const homeCountryRaw = userProfile?.location || userProfile?.country || null;
  const homeCountryCode = homeCountryRaw
    ? homeCountryRaw.replace(/[,\s].*/,'').slice(0,3).toUpperCase()
    : '—';

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
        return !Number.isNaN(ms) && ms > today ? { startMs: ms } : null;
      })
      .filter(Boolean) as { startMs: number }[];
    if (!candidates.length) return null;
    candidates.sort((a, b) => a.startMs - b.startMs);
    return candidates[0];
  }, [userTrips]);

  // Barcode encodes: name + stats. Code128 supports printable ASCII.
  const barcodeValue = React.useMemo(() => {
    const safeName = userFirstName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'EXPLORER';
    return `${safeName}V${visitedCount}P${plannedCount}U${upcomingCount}`;
  }, [userFirstName, visitedCount, plannedCount, upcomingCount]);

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
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);

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
      <KalaLotus size={780} color="#FF6B8A" opacity={0.15} style={{ position: 'absolute', top: -80, right: -80, zIndex: 0, pointerEvents: 'none' }} />
      <TopBar />

      {/* HERO SECTION */}
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 2, md: 3 }, pb: 2, position: 'relative', zIndex: 2 }}>

      {/* ── No upcoming trip: full discovery experience ── */}
      {userTripsLoading ? (
        <Box sx={{ height: { xs: 220, md: 260 }, borderRadius: '20px' }} />
      ) : !nextUpcomingTrip && (
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'row', 
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
            <Box sx={{ mb: 4, p: { xs: '28px 24px', md: '36px 40px' }, borderRadius: '20px', position: 'relative', overflow: 'hidden',
              background: 'linear-gradient(135deg, #0D0D14 0%, #130A1A 55%, #0D0D14 100%)',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.18)',
            }}>
              {/* Ambient glow */}
              <Box sx={{ position: 'absolute', top: '-40%', left: '-5%', width: '50%', height: '200%', background: 'radial-gradient(ellipse, rgba(255,56,92,0.14) 0%, transparent 65%)', pointerEvents: 'none' }} />
              <Box sx={{ position: 'absolute', bottom: '-30%', right: '-5%', width: '45%', height: '160%', background: 'radial-gradient(ellipse, rgba(139,92,246,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />

              <Box sx={{ position: 'relative', zIndex: 1 }}>
                {/* Eyebrow */}
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.5, borderRadius: '50px', background: 'rgba(255,56,92,0.14)', border: '1px solid rgba(255,56,92,0.28)', mb: 2 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: '#FF385C', boxShadow: '0 0 8px rgba(255,56,92,0.7)' }} />
                  <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,56,92,0.9)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Inter',sans-serif" }}>
                    Your next adventure
                  </Typography>
                </Box>

                {/* Headline */}
                <Typography sx={{ fontFamily: "'Playfair Display', serif", fontSize: { xs: '1.65rem', md: '2.2rem' }, fontWeight: 800, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.02em', mb: 0.75 }}>
                  Travel with people<br />who <Box component="em" sx={{ color: '#FF385C', fontStyle: 'italic' }}>get you.</Box>
                </Typography>
                <Typography sx={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.45)', fontFamily: "'Inter',sans-serif", mb: 3, lineHeight: 1.6, maxWidth: 480 }}>
                  Plan trips around your vibe. Find your crew. Go somewhere that actually feels like you.
                </Typography>

                {/* Vibe selector */}
                <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: "'Inter',sans-serif", mb: 1.25 }}>
                  What kind of traveler are you?
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3.5 }}>
                  {[
                    { label: 'Culture seeker',    emoji: '🎭' },
                    { label: 'Party lover',        emoji: '🎉' },
                    { label: 'Spiritual explorer', emoji: '🧘' },
                    { label: 'Adventure junkie',   emoji: '🏔️' },
                    { label: 'Slow traveler',      emoji: '🌴' },
                    { label: 'Urban explorer',     emoji: '🏙️' },
                  ].map(({ label, emoji }) => {
                    const active = selectedVibe === label;
                    return (
                      <Box
                        key={label}
                        component="button"
                        onClick={() => setSelectedVibe(prev => prev === label ? null : label)}
                        sx={{
                          px: 1.8, py: 0.8, borderRadius: '50px', cursor: 'pointer',
                          fontFamily: "'Inter',sans-serif", fontSize: '0.8rem', fontWeight: 600,
                          border: active ? '1.5px solid #FF385C' : '1.5px solid rgba(255,255,255,0.14)',
                          background: active ? 'rgba(255,56,92,0.18)' : 'rgba(255,255,255,0.05)',
                          color: active ? '#FF385C' : 'rgba(255,255,255,0.65)',
                          transition: 'all 0.18s ease',
                          outline: 'none',
                          '&:hover': { borderColor: active ? '#FF385C' : 'rgba(255,255,255,0.35)', color: active ? '#FF385C' : '#fff', background: active ? 'rgba(255,56,92,0.22)' : 'rgba(255,255,255,0.09)' },
                        }}
                      >
                        {emoji} {label}
                      </Box>
                    );
                  })}
                </Box>

                {/* CTAs */}
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <Box component="button" onClick={() => navigate('/dashboard')}
                    sx={{ px: 2.8, py: 1.1, borderRadius: '50px', cursor: 'pointer', fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: '0.86rem', border: 'none', background: 'linear-gradient(135deg,#FF385C,#D91A50)', color: '#fff', boxShadow: '0 4px 18px rgba(255,56,92,0.38)', transition: 'all 0.2s', outline: 'none', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 28px rgba(255,56,92,0.52)' } }}>
                    Start planning free
                  </Box>
                  <Box component="button" onClick={() => navigate('/community')}
                    sx={{ px: 2.8, py: 1.1, borderRadius: '50px', cursor: 'pointer', fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: '0.86rem', border: '1.5px solid rgba(255,255,255,0.18)', background: 'transparent', color: 'rgba(255,255,255,0.7)', transition: 'all 0.2s', outline: 'none', '&:hover': { borderColor: 'rgba(255,255,255,0.4)', color: '#fff', background: 'rgba(255,255,255,0.06)' } }}>
                    Explore trips
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* ── HAPPENING RIGHT NOW ───────────────────────────── */}
            {publicTrips.length > 0 && (
              <Box sx={{ mb: 5 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 4, height: 22, borderRadius: 2, background: 'linear-gradient(180deg,#FF385C,#D91A50)' }} />
                    <Typography fontWeight={800} sx={{ fontFamily: "'Inter',sans-serif", letterSpacing: '-0.03em', fontSize: { xs: '1.1rem', md: '1.3rem' }, color: 'text.primary' }}>
                      Happening right now
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.5, borderRadius: '50px', background: 'rgba(255,56,92,0.10)', border: '1px solid rgba(255,56,92,0.22)' }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: '#FF385C', boxShadow: '0 0 6px rgba(255,56,92,0.7)' }} />
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#FF385C', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Inter',sans-serif" }}>Live</Typography>
                  </Box>
                </Box>

                {/* Cards grid */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4,1fr)' }, gap: 2 }}>
                  {publicTrips.slice(0, 4).map((trip: any, i: number) => {
                    const tripId = trip.id || trip.Id;
                    const dest = (Array.isArray(trip.countries) && trip.countries[0]) || trip.name || trip.title || 'Unknown';
                    const tripName = trip.name || trip.title || dest;
                    const days = trip.durationDays || trip.duration ||
                      (trip.startDate && trip.endDate ? Math.max(1, Math.round((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86400000)) : null);
                    const rawMembers: any[] = trip.members || trip.invitedUsers || [];
                    const maxSpots = trip.maxMembers || trip.maxParticipants || 8;
                    const spotsLeft = Math.max(0, maxSpots - rawMembers.length);
                    const vibeLabel = trip.travelPersonality || trip.vibe || trip.travelStyle || null;
                    const coverImg = (typeof trip.photoUrl === 'string' && trip.photoUrl.trim())
                      ? trip.photoUrl
                      : (tripId && publicTripImages[tripId]) || '';
                    const ACOLORS = ['#FF385C','#8B5CF6','#10B981','#0EA5E9','#F59E0B','#EC4899'];
                    const aColor = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return ACOLORS[h % ACOLORS.length]; };
                    // fun fallback gradients when no image yet
                    const FALLBACKS = [
                      'linear-gradient(145deg,#FF385C 0%,#7C2D7C 100%)',
                      'linear-gradient(145deg,#0EA5E9 0%,#6366F1 100%)',
                      'linear-gradient(145deg,#10B981 0%,#0EA5E9 100%)',
                      'linear-gradient(145deg,#F59E0B 0%,#EF4444 100%)',
                    ];
                    return (
                      <Box
                        key={tripId || i}
                        onClick={() => navigate(`/trip/${tripId}`)}
                        sx={{
                          position: 'relative',
                          borderRadius: '18px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          height: { xs: 200, md: 240 },
                          boxShadow: '0 4px 24px rgba(0,0,0,0.22)',
                          transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-6px) scale(1.02)',
                            boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
                          },
                          '&:hover .hn-img': { transform: 'scale(1.08)' },
                          '&:hover .hn-join': { opacity: 1, transform: 'translateY(0)' },
                        }}
                      >
                        {/* Background image or gradient */}
                        {coverImg ? (
                          <Box
                            className="hn-img"
                            component="img"
                            src={coverImg}
                            alt={dest}
                            sx={{
                              position: 'absolute', inset: 0,
                              width: '100%', height: '100%',
                              objectFit: 'cover',
                              transition: 'transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94)',
                            }}
                          />
                        ) : (
                          <Box
                            className="hn-img"
                            sx={{
                              position: 'absolute', inset: 0,
                              background: FALLBACKS[i % FALLBACKS.length],
                              transition: 'transform 0.5s ease',
                            }}
                          />
                        )}

                        {/* Dark gradient overlay */}
                        <Box sx={{
                          position: 'absolute', inset: 0,
                          background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.28) 50%, rgba(0,0,0,0.08) 100%)',
                        }} />

                        {/* LIVE pulse dot top-left */}
                        <Box sx={{
                          position: 'absolute', top: 12, left: 12,
                          display: 'flex', alignItems: 'center', gap: 0.5,
                          px: 1, py: 0.4,
                          borderRadius: '50px',
                          backdropFilter: 'blur(10px)',
                          background: 'rgba(0,0,0,0.45)',
                          border: '1px solid rgba(255,255,255,0.15)',
                        }}>
                          <Box sx={{
                            width: 6, height: 6, borderRadius: '50%', background: '#FF385C',
                            boxShadow: '0 0 0 0 rgba(255,56,92,0.7)',
                            animation: 'livePulse 1.5s infinite',
                            '@keyframes livePulse': {
                              '0%': { boxShadow: '0 0 0 0 rgba(255,56,92,0.7)' },
                              '70%': { boxShadow: '0 0 0 6px rgba(255,56,92,0)' },
                              '100%': { boxShadow: '0 0 0 0 rgba(255,56,92,0)' },
                            },
                          }} />
                          <Typography sx={{ fontSize: '0.58rem', fontWeight: 800, color: '#fff', letterSpacing: '0.1em', fontFamily: "'Inter',sans-serif" }}>LIVE</Typography>
                        </Box>

                        {/* Spots badge top-right */}
                        <Box sx={{
                          position: 'absolute', top: 12, right: 12,
                          px: 1, py: 0.4, borderRadius: '50px',
                          backdropFilter: 'blur(10px)',
                          background: spotsLeft === 0 ? 'rgba(255,56,92,0.85)' : 'rgba(0,0,0,0.45)',
                          border: `1px solid ${spotsLeft === 0 ? 'rgba(255,56,92,0.6)' : 'rgba(255,255,255,0.15)'}`,
                        }}>
                          <Typography sx={{ fontSize: '0.58rem', fontWeight: 700, color: '#fff', fontFamily: "'Inter',sans-serif", letterSpacing: '0.04em' }}>
                            {spotsLeft === 0 ? '🔥 Full' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
                          </Typography>
                        </Box>

                        {/* Hover CTA */}
                        <Box
                          className="hn-join"
                          sx={{
                            position: 'absolute', top: '50%', left: '50%',
                            transform: 'translate(-50%, calc(-50% + 8px))',
                            opacity: 0,
                            transition: 'opacity 0.2s ease, transform 0.2s ease',
                            px: 2.2, py: 0.8, borderRadius: '50px',
                            background: 'linear-gradient(135deg,#FF385C,#D91A50)',
                            boxShadow: '0 6px 20px rgba(255,56,92,0.55)',
                            pointerEvents: 'none',
                          }}
                        >
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', fontFamily: "'Inter',sans-serif", letterSpacing: '0.02em' }}>
                            View Trip →
                          </Typography>
                        </Box>

                        {/* Bottom content */}
                        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: '14px 16px' }}>
                          {/* Vibe + days */}
                          {(vibeLabel || days) && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.6, flexWrap: 'wrap' }}>
                              {vibeLabel && (
                                <Box sx={{ px: 0.9, py: 0.25, borderRadius: '50px', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)' }}>
                                  <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, color: '#fff', fontFamily: "'Inter',sans-serif" }}>{vibeLabel}</Typography>
                                </Box>
                              )}
                              {days && (
                                <Box sx={{ px: 0.9, py: 0.25, borderRadius: '50px', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)' }}>
                                  <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, color: '#fff', fontFamily: "'Inter',sans-serif" }}>{days}d</Typography>
                                </Box>
                              )}
                            </Box>
                          )}

                          <Typography sx={{
                            fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: '0.95rem',
                            color: '#fff', lineHeight: 1.25, mb: 1,
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                            textShadow: '0 1px 4px rgba(0,0,0,0.4)',
                          }}>
                            {tripName}
                          </Typography>

                          {/* Stacked avatars */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ display: 'flex' }}>
                              {(rawMembers.length > 0 ? rawMembers : [{}]).slice(0, 5).map((m: any, j: number) => {
                                const u = m.user || m.User || m;
                                const fn = u.fname || u.firstName || u.name || '?';
                                const pic = u.profilePic || u.profilepicture || u.profilePicture || u.avatar || '';
                                const initial = String(fn).charAt(0).toUpperCase();
                                return (
                                  <Box key={j} sx={{
                                    width: 22, height: 22, borderRadius: '50%',
                                    border: '2px solid rgba(0,0,0,0.6)',
                                    ml: j > 0 ? '-7px' : 0,
                                    background: aColor(fn),
                                    overflow: 'hidden',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.5rem', fontWeight: 800, color: '#fff',
                                    zIndex: 5 - j,
                                    fontFamily: "'Inter',sans-serif",
                                  }}>
                                    {pic ? <img src={pic} alt={fn} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : initial}
                                  </Box>
                                );
                              })}
                            </Box>
                            {rawMembers.length > 0 && (
                              <Typography sx={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.7)', fontFamily: "'Inter',sans-serif", fontWeight: 500 }}>
                                {rawMembers.length} going
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* ── BROWSE BY VIBE ────────────────────────────────── */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Box sx={{ width: 4, height: 22, borderRadius: 2, background: 'linear-gradient(180deg, #FF385C, #D91A50)' }} />
                <Typography variant="h5" fontWeight={700} sx={{ fontFamily: "'Inter', sans-serif", letterSpacing: '-0.025em', fontSize: { xs: '1.1rem', md: '1.3rem' } }}>
                  Browse by Vibe
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: { xs: 3, md: 4 }, overflowX: 'auto', pb: 1.5, '&::-webkit-scrollbar': { display: 'none' } }}>
                {[
                  { label: 'Timeless', icon: iconArchitecture, glow: 'rgba(168,85,247,0.55)',  accent: '#ffc400' },
                  { label: 'Coastal',  icon: iconBeaches,      glow: 'rgba(56,189,248,0.55)',  accent: '#0EA5E9' },
                  { label: 'Urban',    icon: iconCity,         glow: 'rgba(251,191,36,0.55)',  accent: '#F59E0B' },
                  { label: 'Wild',     icon: iconForest,       glow: 'rgba(52,211,153,0.55)',  accent: '#10B981' },
                  { label: 'Summit',   icon: iconMountains,    glow: 'rgba(129,140,248,0.55)', accent: '#00afe4' },
                ].map((cat) => (
                  <Box key={cat.label} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, cursor: 'pointer', flexShrink: 0, py: 1.5, px: 1, background: 'transparent', border: 'none', transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', '&:hover': { transform: 'translateY(-6px)', '& .cat-icon-img': { filter: `drop-shadow(0 0 10px ${cat.glow}) drop-shadow(0 0 22px ${cat.glow})`, transform: 'scale(1.15)' }, '& .cat-label': { color: cat.accent } } }}>
                    <img className="cat-icon-img" src={cat.icon} alt={cat.label} style={{ width: 80, height: 80, objectFit: 'contain', display: 'block', transition: 'filter 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))' }} />
                    <Typography className="cat-label" sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'text.secondary', fontFamily: "'Inter', sans-serif", letterSpacing: '0.01em', transition: 'color 0.25s ease', userSelect: 'none' }}>{cat.label}</Typography>
                  </Box>
                ))}
              </Box>
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
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress size={32} sx={{ color: '#FF385C' }} />
                </Box>
              )}
              {publicError && !loadingPublic && <Alert severity="error" sx={{ mb: 2 }}>{publicError}</Alert>}
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
                        {recommended.map((t, tIdx) => {
                          const coverImg = getCover(t);
                          const tripName = t.name || t.title || 'Untitled Trip';
                          const countriesList: string[] = Array.isArray(t.countries) ? t.countries : [];
                          const tripRating = parseFloat((3.5 + (tIdx * 7 + 3) % 15 / 10).toFixed(1));
                          const ownerMember = ownerToMember(t.owner);

                          return (
                            <Box key={t.id || t.Id}>
                              <TripCard
                                title={tripName}
                                image={coverImg}
                                countries={countriesList}
                                rating={tripRating}
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
                          {alsoCheckout.map((t, tIdx) => {
                            const coverImg = getCover(t);
                            const tripName = t.name || t.title || 'Untitled Trip';
                            const countriesList: string[] = Array.isArray(t.countries) ? t.countries : [];
                            const tripRating = parseFloat((3.4 + (tIdx * 9 + 2) % 16 / 10).toFixed(1));
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
                                    color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.3, mb: 1,
                                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                  }}>{tripName}</Typography>

                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                      <AlsoCheckoutAvatar member={ownerMember} />
                                      <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.75)', fontFamily: "'Inter',sans-serif", fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>{ownerMember.name}</Typography>
                                    </Box>
                                    <Box sx={{
                                      display: 'flex', alignItems: 'center', gap: 0.35,
                                      px: 0.9, py: 0.35, borderRadius: '50px',
                                      backdropFilter: 'blur(6px)',
                                      background: 'rgba(255,255,255,0.15)',
                                      border: '1px solid rgba(255,255,255,0.2)',
                                    }}>
                                      <StarRoundedIcon sx={{ fontSize: 10, color: '#FFD700' }} />
                                      <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: '#fff', fontFamily: "'Inter',sans-serif" }}>{tripRating}</Typography>
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
                onClick={handleExploreTrips}
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

      {/* ── Has upcoming trip: Boarding Pass ── */}
      {!userTripsLoading && nextUpcomingTrip && (
        <>
        <Box ref={heroRef} className="gs-hero" style={{ opacity: 0, transform: 'translateY(56px)' }} sx={{
          position: 'relative',
          borderRadius: '20px',
          overflow: 'hidden',
          background: '#FFFFFF',
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08), 0 24px 56px rgba(0,0,0,0.10)',
          border: '1px solid rgba(0,0,0,0.065)',
          minHeight: { xs: 'auto', lg: 260 },
        }}>
          {/* Left coral accent stripe */}
          <Box sx={{
            width: 7, flexShrink: 0,
            background: 'linear-gradient(180deg, #FF6B6B 0%, #FF385C 35%, #C2185B 100%)',
          }} />

          {/* Main ticket body */}
          <Box sx={{
            flex: 1,
            p: { xs: '20px 18px', sm: '26px 32px', md: '28px 40px' },
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            // Subtle dot-pattern texture
            backgroundImage: 'radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}>
            {/* ── Row 1: Branding + status pill ── */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3.5 }}>
              <Box>
                <Typography sx={{
                  fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.22em',
                  color: '#CCCCCC', textTransform: 'uppercase',
                  fontFamily: "'Inter', sans-serif", mb: 0.4,
                }}>boarding pass</Typography>
                <Box component="img"
                  src={import.meta.env.VITE_TRIPICIAN_LOGO_FULL_BLACK_2_URL}
                  alt="Tripician"
                  sx={{ height: 20, width: 'auto', display: 'block' }}
                />
              </Box>
              <Box sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.75,
                px: 1.5, py: 0.55, borderRadius: '50px',
                background: 'rgba(255,56,92,0.07)',
                border: '1px solid rgba(255,56,92,0.20)',
              }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: '#FF385C', boxShadow: '0 0 6px rgba(255,56,92,0.55)' }} />
                <Typography sx={{
                  color: '#FF385C', fontWeight: 700, letterSpacing: '0.10em',
                  textTransform: 'uppercase', fontSize: '0.6rem', fontFamily: "'Inter', sans-serif",
                }}>Welcome back</Typography>
              </Box>
            </Box>

            {/* ── Row 2: Passenger name + route ── */}
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: { xs: 2, md: 4 }, mb: 2.5, flexWrap: 'wrap' }}>
              {/* Passenger */}
              <Box>
                <Typography sx={{
                  fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.18em',
                  color: '#C8C8C8', textTransform: 'uppercase',
                  fontFamily: "'Inter', sans-serif", mb: 0.5,
                }}>Passenger</Typography>
                <Typography sx={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: { xs: '1.8rem', md: '2.6rem' },
                  fontWeight: 800, color: '#111111',
                  lineHeight: 1, letterSpacing: '-0.5px',
                  animation: 'fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both',
                }}>{userFirstName}</Typography>
              </Box>

              {/* Route: HME → DEST */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, md: 3 }, pb: 0.5 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.16em', color: '#C8C8C8', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif", mb: 0.5 }}>From</Typography>
                  <Typography sx={{ fontSize: { xs: '1.25rem', md: '1.7rem' }, fontWeight: 900, color: '#1A1A1A', fontFamily: "'Inter', sans-serif", letterSpacing: '-0.5px', lineHeight: 1 }}>{homeCountryCode}</Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', px: { xs: 0.5, md: 1 } }}>
                  <Typography sx={{ color: '#FF385C', fontSize: '1.1rem', lineHeight: 1, mb: 0.75 }}>✈</Typography>
                  <Box sx={{ width: { xs: 36, md: 60 }, height: 2, background: 'linear-gradient(90deg, #FF6B6B, #C2185B)', borderRadius: 1 }} />
                  <Typography sx={{ fontSize: '0.48rem', fontWeight: 700, color: '#CCCCCC', fontFamily: "'Inter', sans-serif", letterSpacing: '0.12em', mt: 0.75 }}>NONSTOP</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.16em', color: '#C8C8C8', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif", mb: 0.5 }}>To</Typography>
                  <Typography sx={{ fontSize: { xs: '1.25rem', md: '1.7rem' }, fontWeight: 900, color: '#FF385C', fontFamily: "'Inter', sans-serif", letterSpacing: '-0.5px', lineHeight: 1 }}>
                    {nextDestinationLabel.replace(/[,\s].*/,'').slice(0,3).toUpperCase()}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* ── Background ghost plane ── */}
            <Box sx={{
              position: 'absolute',
              right: { lg: '25%' },
              top: '50%',
              transform: 'translateY(-50%) scaleX(-1)',
              display: { xs: 'none', lg: 'block' },
              pointerEvents: 'none',
              zIndex: 0,
              opacity: 0.055,
              color: '#555555',
            }}>
              <ConnectingAirportsIcon sx={{ fontSize: '18rem' }} />
            </Box>

            {/* ── Dashed tear line ── */}
            <Box sx={{ borderTop: '1.5px dashed rgba(0,0,0,0.11)', mx: -1, mb: 3 }} />

            {/* ── Row 3: Ticket info fields ── */}
            <Box sx={{ display: 'flex', gap: { xs: 3, md: 4.5 }, mb: 3, flexWrap: 'wrap' }}>
              {[
                { label: 'Date',      value: new Date(nextUpcomingTrip!.startMs).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) },
                { label: 'Class',     value: 'Explorer' },
                { label: 'Gate',      value: 'TRPC' },
                { label: 'Seat',      value: `${String.fromCharCode(65 + (visitedCount % 6))}${visitedCount || 1}` },
                { label: 'Next Stop', value: nextDestinationLabel },
              ].map((f) => (
                <Box key={f.label}>
                  <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.18em', color: '#C8C8C8', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif", mb: 0.4 }}>{f.label}</Typography>
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#1A1A1A', fontFamily: "'Inter', sans-serif", letterSpacing: '-0.01em' }}>{f.value}</Typography>
                </Box>
              ))}
            </Box>

            {/* ── Quote ── */}
            <Typography sx={{
              fontStyle: 'italic', color: '#B0B0B0',
              fontSize: '0.86rem', lineHeight: 1.7,
              mb: 3.5,
              borderLeft: '2.5px solid #FF385C', pl: 1.5,
              maxWidth: 460,
            }}>
              {currentMotivation.title}
            </Typography>

            {/* ── CTA Buttons ── */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant="contained" size="large" startIcon={<ExploreIcon />} onClick={handleExploreTrips}
                sx={{
                  px: 3.5, py: 1.35, borderRadius: '50px', textTransform: 'none',
                  fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.92rem',
                  background: 'linear-gradient(135deg, #FF385C 0%, #D91A50 100%)',
                  boxShadow: '0 6px 20px rgba(255,56,92,0.38)',
                  '&:hover': { background: 'linear-gradient(135deg, #E31C5F 0%, #B01550 100%)', boxShadow: '0 12px 32px rgba(255,56,92,0.52)', transform: 'translateY(-2px)' },
                  transition: 'all 0.25s ease', width: { xs: '100%', sm: 'auto' },
                }}
              >Start Planning</Button>
              <Button
                variant="outlined" size="large" startIcon={<PublicIcon />} onClick={handleExploreDashboard}
                sx={{
                  px: 3.5, py: 1.35, borderRadius: '50px', textTransform: 'none',
                  fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.92rem',
                  borderColor: 'rgba(255,56,92,0.35)', color: '#FF385C',
                  '&:hover': { borderColor: '#FF385C', backgroundColor: 'rgba(255,56,92,0.05)', transform: 'translateY(-1px)' },
                  transition: 'all 0.25s ease', width: { xs: '100%', sm: 'auto' },
                }}
              >Explore Dashboard</Button>
            </Stack>
          </Box>

          {/* ── Perforated tear strip ── */}
          <Box sx={{
            display: { xs: 'none', lg: 'flex' },
            flexDirection: 'column', alignItems: 'center',
            width: 30, flexShrink: 0, position: 'relative',
            background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 8px, rgba(0,0,0,0.055) 8px, rgba(0,0,0,0.055) 10px)',
          }}>
            {/* Notch circles — match outer page background */}
            <Box sx={{ width: 28, height: 14, borderRadius: '0 0 50px 50px', background: '#F7F7F7', border: '1px solid rgba(0,0,0,0.07)', borderTop: 'none', flexShrink: 0, mt: '-1px', zIndex: 2, position: 'relative' }} />
            <Box sx={{ flex: 1 }} />
            <Box sx={{ width: 28, height: 14, borderRadius: '50px 50px 0 0', background: '#F7F7F7', border: '1px solid rgba(0,0,0,0.07)', borderBottom: 'none', flexShrink: 0, mb: '-1px', zIndex: 2, position: 'relative' }} />
          </Box>

          {/* ── Right stub ── */}
          <Box sx={{
            display: { xs: 'none', lg: 'flex' },
            flexDirection: 'column',
            width: 240, flexShrink: 0,
            background: 'linear-gradient(170deg, #FF385C 0%, #D4104A 55%, #8B0D3F 100%)',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Rotated background watermark */}
            <Typography sx={{
              position: 'absolute', left: '50%', top: '42%',
              transform: 'translateX(-50%) rotate(-90deg)',
              fontSize: '0.44rem', fontWeight: 900, letterSpacing: '0.55em',
              color: 'rgba(255,255,255,0.05)', pointerEvents: 'none',
              textTransform: 'uppercase', fontFamily: "'Inter', sans-serif",
              whiteSpace: 'nowrap',
            }}>PASSENGER STUB</Typography>

            {/* Header strip */}
            <Box sx={{
              px: 3, pt: 2.5, pb: 1.5,
              borderBottom: '1px solid rgba(255,255,255,0.10)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <Typography sx={{
                fontSize: '0.44rem', fontWeight: 800, letterSpacing: '0.32em',
                color: 'rgba(255,255,255,0.32)', fontFamily: "'Inter', sans-serif",
                textTransform: 'uppercase',
              }}>Travel Stats</Typography>
              <Box sx={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {[1,0.5,1].map((o, i) => (
                  <Box key={i} sx={{ width: 5, height: 5, borderRadius: '50%', background: `rgba(255,255,255,${o * 0.22})` }} />
                ))}
              </Box>
            </Box>

            {/* Stats */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', px: 3, py: 2.5, position: 'relative' }}>
              {[
                { label: 'Countries', sub: 'VISITED',  value: visitedCount,  Icon: PublicIcon },
                { label: 'Trips',     sub: 'PLANNED',  value: plannedCount,  Icon: TrendingUpIcon },
                { label: 'Upcoming',  sub: 'JOURNEYS', value: upcomingCount, Icon: ExploreIcon },
              ].map((s, i) => (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <Box sx={{
                      my: 2,
                      height: '1px',
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 40%, rgba(255,255,255,0.18) 60%, transparent 100%)',
                    }} />
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Box>
                      <Typography sx={{
                        color: 'rgba(255,255,255,0.92)', fontSize: '0.82rem', fontWeight: 600,
                        fontFamily: "'Inter', sans-serif", lineHeight: 1.15,
                      }}>{s.label}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                        <s.Icon sx={{ color: 'rgba(255,255,255,0.32)', fontSize: 9 }} />
                        <Typography sx={{
                          color: 'rgba(255,255,255,0.32)', fontSize: '0.5rem', fontWeight: 700,
                          letterSpacing: '0.2em', fontFamily: "'Inter', sans-serif",
                        }}>{s.sub}</Typography>
                      </Box>
                    </Box>
                    <Typography sx={{
                      color: '#FFFFFF', fontFamily: "'Playfair Display', serif",
                      fontSize: '3.6rem', fontWeight: 900, lineHeight: 1,
                      letterSpacing: '-0.04em',
                      textShadow: '0 2px 24px rgba(0,0,0,0.28)',
                    }}>{s.value}</Typography>
                  </Box>
                </React.Fragment>
              ))}
            </Box>

            {/* Perforation tear line */}
            <Box sx={{ px: 3, position: 'relative', overflow: 'visible' }}>
              <Box sx={{ borderTop: '1.5px dashed rgba(255,255,255,0.22)' }} />
            </Box>

            {/* Barcode section */}
            <Box sx={{
              background: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              px: '12px', pt: '10px', pb: '8px',
              '& svg': { display: 'block', maxWidth: '100%' },
            }}>
              <Barcode
                value={barcodeValue}
                format="CODE128"
                width={1.3}
                height={52}
                fontSize={8}
                margin={0}
                background="#FFFFFF"
                lineColor="#111111"
                displayValue={true}
                font="'Courier New', monospace"
                textAlign="center"
                textMargin={4}
              />
            </Box>
          </Box>
        </Box>
        {/* ── Logo strip below boarding pass ── */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pt: 2.5, pb: 0.5,
          gap: 1.5,
          opacity: 0.48,
        }}>
          <Box
            component="img"
            src={import.meta.env.VITE_TRIPICIAN_LOGO_FULL_BLACK_2_URL}
            alt="Tripician"
            sx={{ height: 22, width: 'auto', filter: 'grayscale(1)' }}
          />
        </Box>
        </>
      )}

      </Box>

      {/* MAIN BODY — users with upcoming trip still see community content */}
      {!userTripsLoading && nextUpcomingTrip && (
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'row', 
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
              <Typography sx={{
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
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={32} sx={{ color: '#FF385C' }} />
              </Box>
            )}
            {publicError && !loadingPublic && <Alert severity="error" sx={{ mb: 2 }}>{publicError}</Alert>}
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
                      {recommended.map((t, tIdx) => {
                        const coverImg = getCover(t);
                        const tripName = t.name || t.title || 'Untitled Trip';
                        const countriesList: string[] = Array.isArray(t.countries) ? t.countries : [];
                        const tripRating = parseFloat((3.5 + (tIdx * 7 + 3) % 15 / 10).toFixed(1));
                        const ownerMember = ownerToMember(t.owner);

                        return (
                          <Box key={t.id || t.Id}>
                            <TripCard
                              title={tripName}
                              image={coverImg}
                              countries={countriesList}
                              rating={tripRating}
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
                        {alsoCheckout.map((t, tIdx) => {
                          const coverImg = getCover(t);
                          const tripName = t.name || t.title || 'Untitled Trip';
                          const countriesList: string[] = Array.isArray(t.countries) ? t.countries : [];
                          const tripRating = parseFloat((3.4 + (tIdx * 9 + 2) % 16 / 10).toFixed(1));
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
                                  color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.3, mb: 1,
                                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                }}>{tripName}</Typography>

                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                    <AlsoCheckoutAvatar member={ownerMember} />
                                    <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.75)', fontFamily: "'Inter',sans-serif", fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>{ownerMember.name}</Typography>
                                  </Box>
                                  <Box sx={{
                                    display: 'flex', alignItems: 'center', gap: 0.35,
                                    px: 0.9, py: 0.35, borderRadius: '50px',
                                    backdropFilter: 'blur(6px)',
                                    background: 'rgba(255,255,255,0.15)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                  }}>
                                    <StarRoundedIcon sx={{ fontSize: 10, color: '#FFD700' }} />
                                    <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: '#fff', fontFamily: "'Inter',sans-serif" }}>{tripRating}</Typography>
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
              onClick={handleExploreTrips}
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
      <TripCreationModal open={createTripOpen} onClose={() => setCreateTripOpen(false)} />
    </Box>
  );
};

export default Home;
