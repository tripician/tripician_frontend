import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, CircularProgress, Alert, Stack, Avatar } from '@mui/material';
import { useSelector } from 'react-redux';
import ExploreIcon from '@mui/icons-material/TravelExplore';
import PublicIcon from '@mui/icons-material/Public';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';

import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ConnectingAirportsIcon from '@mui/icons-material/ConnectingAirports';
import TopBar from '../PageLayout/CommonLayouts/TopBar';
import { useNavigate } from 'react-router-dom';
import { apiServices } from '../../services/APIs/apiServices';
import covers from '../../assets/covers.json';
import TripCreationModal from '../../components/CreateTripComponents/TripCreationModal';
import TripCard from '../DashboardPage/TripCard';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { countryAlpha3FromCode, countryAlpha3FromName, countryNameFromCode, countryCodeFromName } from '../../utils/countryFlags';
import Barcode from 'react-barcode';

const Home: React.FC = () => {
  const navigate = useNavigate();

  const featuredDestinations = [
    {
      id: 1,
      title: 'Santorini, Greece',
      description: 'Experience the stunning sunsets and white-washed buildings of this iconic Greek island.',
      image: covers['greece'],
      trending: true,
      badge: '🔥 Hot',
    },
    {
      id: 2,
      title: 'Kyoto, Japan',
      description: 'Discover the ancient temples and traditional culture of Japan\'s former capital.',
      image: covers['japan'],
      trending: true,
      badge: '🗿 Explore',
    },
    {
      id: 3,
      title: 'Paris, France',
      description: 'Explore the city of lights and its romantic charm.',
      image: covers['france'],
      trending: true,
      badge: '❤️ Romantic',
    },
    {
      id: 4,
      title: 'Dubai, UAE',
      description: 'Experience luxury and modern architecture in the desert.',
      image: covers['uae'],
      trending: true,
      badge: '🏙️ Modern',
    },
  ];

  const [publicTrips, setPublicTrips] = useState<any[]>([]);
  const [loadingPublic, setLoadingPublic] = useState(false);
  const [publicError, setPublicError] = useState<string | null>(null);
  const [createTripOpen, setCreateTripOpen] = useState(false);
  const { token: authToken } = useAuthToken();
  const [userTrips, setUserTrips] = useState<any[]>([]);
  const [, setUserTripsLoading] = useState(false);
  const [, setUserTripsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchPublic = async () => {
      setLoadingPublic(true);
      try {
        const response = await apiServices.getPublicTrips();
        if (active) {
          setPublicTrips(response.data || []);
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
    if (!authToken) return;
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
  }, [authToken]);

  const handleExploreTrips = () => {
    setCreateTripOpen(true);
  };

  const handleExploreDashboard = () => {
    navigate('/dashboard');
  }

  // User profile from store
  const userProfile = useSelector((state: any) => state.user?.profile);
  const userFirstName = userProfile?.fname || userProfile?.email?.split('@')[0] || 'Explorer';

  // Derive a 3-letter IATA-style home country code from profile
  const homeCountryRaw = userProfile?.country || 'HOME';
  const homeCountryCode = homeCountryRaw
    ? homeCountryRaw.replace(/[,\s].*/,'').slice(0,3).toUpperCase()
    : 'HME';

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

  useEffect(() => {
    if (!statusMessages.length) return;
    const statusIndex = Math.floor(Math.random() * statusMessages.length);
    setCurrentStatusMessages(statusMessages[statusIndex]);

    const motivationIndex = Math.floor(Math.random() * motivationalQuotes.length);
    setCurrentMotivation({ title: motivationalQuotes[motivationIndex] });
  }, [statusMessages, motivationalQuotes]);

  return (
    <Box
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
      <TopBar />

      {/* HERO SECTION — Boarding Pass */}
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 2, md: 3 }, pb: 2, position: 'relative', zIndex: 2 }}>
        {/* Outer ticket card */}
        <Box sx={{
          position: 'relative',
          borderRadius: '20px',
          overflow: 'hidden',
          background: '#FFFFFF',
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08), 0 24px 56px rgba(0,0,0,0.10)',
          border: '1px solid rgba(0,0,0,0.065)',
          minHeight: { xs: 'auto', lg: 340 },
        }}>
          {/* Left coral accent stripe */}
          <Box sx={{
            width: 7, flexShrink: 0,
            background: 'linear-gradient(180deg, #FF6B6B 0%, #FF385C 35%, #C2185B 100%)',
          }} />

          {/* Main ticket body */}
          <Box sx={{
            flex: 1,
            p: { xs: '28px 22px', sm: '36px 40px', md: '40px 48px' },
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
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: { xs: 2, md: 5 }, mb: 3.5, flexWrap: 'wrap' }}>
              {/* Passenger */}
              <Box>
                <Typography sx={{
                  fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.18em',
                  color: '#C8C8C8', textTransform: 'uppercase',
                  fontFamily: "'Inter', sans-serif", mb: 0.5,
                }}>Passenger</Typography>
                <Typography sx={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: { xs: '2.6rem', md: '3.8rem' },
                  fontWeight: 800, color: '#111111',
                  lineHeight: 1, letterSpacing: '-1px',
                  animation: 'fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both',
                }}>{userFirstName}</Typography>
              </Box>

              {/* Route: HME → DEST */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, md: 3 }, pb: 0.5 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.16em', color: '#C8C8C8', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif", mb: 0.5 }}>From</Typography>
                  <Typography sx={{ fontSize: { xs: '1.7rem', md: '2.4rem' }, fontWeight: 900, color: '#1A1A1A', fontFamily: "'Inter', sans-serif", letterSpacing: '-1px', lineHeight: 1 }}>{homeCountryCode}</Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', px: { xs: 0.5, md: 1 } }}>
                  <Typography sx={{ color: '#FF385C', fontSize: '1.1rem', lineHeight: 1, mb: 0.75 }}>✈</Typography>
                  <Box sx={{ width: { xs: 36, md: 60 }, height: 2, background: 'linear-gradient(90deg, #FF6B6B, #C2185B)', borderRadius: 1 }} />
                  <Typography sx={{ fontSize: '0.48rem', fontWeight: 700, color: '#CCCCCC', fontFamily: "'Inter', sans-serif", letterSpacing: '0.12em', mt: 0.75 }}>NONSTOP</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.16em', color: '#C8C8C8', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif", mb: 0.5 }}>To</Typography>
                  <Typography sx={{ fontSize: { xs: '1.7rem', md: '2.4rem' }, fontWeight: 900, color: '#FF385C', fontFamily: "'Inter', sans-serif", letterSpacing: '-1px', lineHeight: 1 }}>
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
                { label: 'Date',      value: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) },
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
      </Box>

      {/* CATEGORIES ROW */}
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, pb: 5, zIndex: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box sx={{ width: 4, height: 22, borderRadius: 2, background: 'linear-gradient(180deg, #FF385C, #D91A50)' }} />
          <Typography variant="h5" fontWeight={700} sx={{
            fontFamily: "'Inter', sans-serif",
            letterSpacing: '-0.025em',
            fontSize: { xs: '1.1rem', md: '1.3rem' },
          }}>
            Browse by Vibe
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: { xs: 1.5, md: 2 }, overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
          {[
            { label: 'Timeless', emoji: '🏛', gradient: 'linear-gradient(145deg, #7C3AED, #A855F7)' },
            { label: 'Coastal',  emoji: '🏖', gradient: 'linear-gradient(145deg, #0284C7, #38BDF8)' },
            { label: 'Urban',    emoji: '🌆', gradient: 'linear-gradient(145deg, #D97706, #FCD34D)' },
            { label: 'Wild',     emoji: '🌲', gradient: 'linear-gradient(145deg, #059669, #34D399)' },
            { label: 'Summit',   emoji: '🏔', gradient: 'linear-gradient(145deg, #4F46E5, #818CF8)' },
          ].map((cat) => (
            <Box
              key={cat.label}
              sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5,
                cursor: 'pointer', flexShrink: 0,
                pt: 2.5, pb: 2, px: { xs: 3, md: 4 },
                borderRadius: 4,
                border: '1.5px solid',
                borderColor: 'divider',
                backgroundColor: 'background.paper',
                boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
                transition: 'all 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  borderColor: '#FF385C',
                  boxShadow: '0 8px 28px rgba(255,56,92,0.15)',
                  transform: 'translateY(-5px)',
                  '& .cat-bg': { opacity: 0.1 },
                  '& .cat-label': { color: '#FF385C' },
                },
              }}
            >
              {/* Subtle color wash on hover */}
              <Box className="cat-bg" sx={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(145deg, #FF385C, #E31C5F)',
                opacity: 0, transition: 'opacity 0.22s ease',
                pointerEvents: 'none',
              }} />
              <Box sx={{
                width: 60, height: 60, borderRadius: '50%',
                background: cat.gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.7rem',
                boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                position: 'relative', zIndex: 1,
              }}>
                {cat.emoji}
              </Box>
              <Typography className="cat-label" sx={{
                fontSize: '0.76rem', fontWeight: 700,
                color: 'text.primary',
                fontFamily: "'Inter', sans-serif",
                letterSpacing: '0.01em',
                position: 'relative', zIndex: 1,
                transition: 'color 0.2s ease',
              }}>
                {cat.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* MAIN BODY */}
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
              // Helper: resolve cover image for a trip
              const getCover = (t: typeof publicTrips[0]): string => {
                if (typeof t.cover === 'string' && Object.prototype.hasOwnProperty.call(covers, t.cover))
                  return covers[t.cover as keyof typeof covers];
                if (Array.isArray(t.countries) && t.countries.length > 0 && typeof t.countries[0] === 'string' && Object.prototype.hasOwnProperty.call(covers, t.countries[0].toLowerCase()))
                  return covers[t.countries[0].toLowerCase() as keyof typeof covers];
                return covers['default'] || (Object.values(covers)[0] as string);
              };
              // Helper: extract display name from owner (may be string, object, or number)
              const ownerName = (owner: unknown): string => {
                if (!owner) return 'Traveler';
                const str = typeof owner === 'string' ? owner : typeof owner === 'object' && owner !== null && 'name' in owner ? String((owner as Record<string, unknown>).name) : typeof owner === 'object' && owner !== null && 'email' in owner ? String((owner as Record<string, unknown>).email) : String(owner);
                if (!str || str === 'undefined') return 'Traveler';
                const base = str.includes('@') ? str.split('@')[0] : str;
                return base.replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim() || 'Traveler';
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
                        const likeCount = 18 + (tIdx * 13 + 5) % 74;
                        const tripRating = parseFloat((3.8 + (likeCount % 12) / 10).toFixed(1));
                        const author = ownerName(t.owner);

                        return (
                          <TripCard
                            key={t.id || t.Id}
                            title={tripName}
                            image={coverImg}
                            countries={countriesList}
                            rating={tripRating}
                            likes={likeCount}
                            owner={author}
                            onClick={() => navigate(`/trip/${t.id || t.Id}`)}
                          />
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
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                        {alsoCheckout.map((t, tIdx) => {
                          const coverImg = getCover(t);
                          const tripName = t.name || t.title || 'Untitled Trip';
                          const countriesList: string[] = Array.isArray(t.countries) ? t.countries : [];
                          const likeCount = 8 + (tIdx * 11 + 7) % 55;
                          const author = ownerName(t.owner);
                          const authorInitial = author[0].toUpperCase();
                          const isOwner = t.owner && userId && t.owner === userId;
                          const isMember = Array.isArray(t.members) && userId && t.members.includes(userId);

                          return (
                            <Box
                              key={t.id || t.Id}
                              onClick={() => navigate(`/trip/${t.id || t.Id}`)}
                              sx={{
                                display: 'flex',
                                borderRadius: '14px',
                                overflow: 'hidden',
                                background: '#FFFFFF',
                                border: '1px solid rgba(0,0,0,0.07)',
                                boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
                                cursor: 'pointer',
                                height: 86,
                                transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.2s',
                                '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 8px 28px rgba(0,0,0,0.10)', borderColor: 'rgba(255,56,92,0.2)' },
                                '&:hover .co-img': { transform: 'scale(1.08)' },
                              }}
                            >
                              {/* Thumbnail */}
                              <Box sx={{ width: 86, flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
                                <Box
                                  className="co-img"
                                  component="img"
                                  src={coverImg}
                                  alt={tripName}
                                  sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.35s ease' }}
                                />
                                {(isOwner || isMember) && (
                                  <Box
                                    onClick={e => { e.stopPropagation(); navigate(`/trip/${t.id || t.Id}/edit`); }}
                                    sx={{
                                      position: 'absolute', top: 5, right: 5,
                                      width: 20, height: 20, borderRadius: '50%',
                                      background: 'rgba(255,255,255,0.85)',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      '&:hover': { background: '#FF385C', '& svg': { color: '#fff' } },
                                      transition: 'background 0.18s',
                                    }}
                                  >
                                    <EditRoundedIcon sx={{ fontSize: 10, color: '#555' }} />
                                  </Box>
                                )}
                              </Box>

                              {/* Text */}
                              <Box sx={{ p: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
                                <Typography sx={{
                                  fontWeight: 700, fontSize: '0.8rem',
                                  fontFamily: "'Inter', sans-serif",
                                  color: '#111', letterSpacing: '-0.01em', lineHeight: 1.3,
                                  display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                }}>{tripName}</Typography>

                                {countriesList.length > 0 && (
                                  <Typography sx={{ fontSize: '0.65rem', color: '#999', fontFamily: "'Inter', sans-serif", display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    <PlaceRoundedIcon sx={{ fontSize: 9, color: '#FF385C', mr: 0.3, verticalAlign: 'middle' }} />
                                    {countriesList.join(' · ')}
                                  </Typography>
                                )}

                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Avatar sx={{ width: 16, height: 16, fontSize: '0.45rem', fontWeight: 800, background: 'linear-gradient(135deg, #FF385C, #D91A50)', color: '#fff' }}>{authorInitial}</Avatar>
                                    <Typography sx={{ fontSize: '0.62rem', color: '#AAA', fontFamily: "'Inter', sans-serif", fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', maxWidth: 70 }}>{author}</Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                    <FavoriteRoundedIcon sx={{ fontSize: 9, color: '#FF385C' }} />
                                    <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: '#888', fontFamily: "'Inter', sans-serif" }}>{likeCount}</Typography>
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
            boxShadow: '0 12px 48px rgba(255, 56, 92, 0.20)',
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
      <TripCreationModal open={createTripOpen} onClose={() => setCreateTripOpen(false)} />
    </Box>
  );
};

export default Home;
