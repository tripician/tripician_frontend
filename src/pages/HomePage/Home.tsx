import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, CardMedia, Button, CircularProgress, Alert, Stack, Avatar, Chip } from '@mui/material';
import { useSelector } from 'react-redux';
import ExploreIcon from '@mui/icons-material/TravelExplore';
import PublicIcon from '@mui/icons-material/Public';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ConnectingAirportsIcon from '@mui/icons-material/ConnectingAirports';
import TopBar from '../PageLayout/CommonLayouts/TopBar';
import { useNavigate } from 'react-router-dom';
import { apiServices } from '../../services/APIs/apiServices';
import covers from '../../assets/covers.json';
import TripCreationModal from '../../components/CreateTripComponents/TripCreationModal';
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
            <Box sx={{ mb: 6 }}>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 4, height: 22, borderRadius: 2, background: 'linear-gradient(180deg, #FF385C, #D91A50)' }} />
                <Typography variant="h5" fontWeight={700} sx={{
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: '-0.025em',
                  fontSize: { xs: '1.3rem', md: '1.5rem' },
                }}>
                  Trending Destinations
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {featuredDestinations.map(destination => (
                <Card key={destination.id} sx={{
                  width: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(25% - 18px)' },
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 3,
                  overflow: 'hidden',
                  transition: 'all .35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                  border: '1px solid',
                  borderColor: 'divider',
                  minHeight: 300,
                  position: 'relative',
                  backgroundColor: 'background.paper',
                  '&:hover': { transform: 'translateY(-6px)', boxShadow: '0 18px 44px rgba(0,0,0,0.16)', cursor: 'pointer' }
                }}>
                  {/* Badge */}
                  <Chip 
                    label={destination.badge}
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      zIndex: 2,
                      fontWeight: 600,
                      background: 'rgba(255,255,255,0.95)',
                      backdropFilter: 'blur(10px)',
                    }}
                  />
          <CardMedia component="img" height="210" image={destination.image} alt={destination.title} sx={{ objectFit: 'cover' }} />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography gutterBottom variant="h6" fontWeight="bold" sx={{ fontSize: { xs: "1rem", md: "1.25rem" } }}>
                      {destination.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.85rem", md: "0.875rem" } }}>
                      {destination.description}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
            </Box>
          </Box>

          {/* Community Adventures */}
          <Box sx={{ mt: 2 }}>
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 4, height: 22, borderRadius: 2, background: 'linear-gradient(180deg, #FF385C, #D91A50)' }} />
                <Typography variant="h5" fontWeight={700} sx={{
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: '-0.025em',
                  fontSize: { xs: '1.3rem', md: '1.5rem' },
                }}>
                  Community Adventures
                </Typography>
              </Box>
          </Box>

            {loadingPublic && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            )}

            {publicError && !loadingPublic && (
              <Alert severity="error" sx={{ mb: 2 }}>{publicError}</Alert>
            )}

            {!loadingPublic && !publicError && publicTrips.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                No public trips yet.
              </Typography>
            )}

            {!loadingPublic && !publicError && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
                {publicTrips.map(t => (
                  <Card
                    key={t.id || t.Id}
                    sx={{
                      width: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(25% - 18px)' },
                      borderRadius: 3,
                      boxShadow: 2,
                      transition: 'all .2s ease',
                      minHeight: 320,
                      overflow: 'hidden',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      '&:hover': { transform: 'translateY(-4px)', boxShadow: 5 }
                    }}
                    onClick={() => {
                      // Go to trip view page for this trip
                      navigate(`/trip/${t.id || t.Id}`);
                    }}
                  >
                    {/* Cover image */}
                    {(() => {
                      // Try to get cover image from t.cover, t.countries[0], or fallback
                      let coverImg: string | undefined = undefined;
                      if (typeof t.cover === 'string' && Object.prototype.hasOwnProperty.call(covers, t.cover)) {
                        coverImg = covers[t.cover as keyof typeof covers];
                      } else if (
                        Array.isArray(t.countries) &&
                        t.countries.length > 0 &&
                        typeof t.countries[0] === 'string' &&
                        Object.prototype.hasOwnProperty.call(covers, t.countries[0].toLowerCase())
                      ) {
                        coverImg = covers[t.countries[0].toLowerCase() as keyof typeof covers];
                      } else {
                        coverImg = covers['default'] || Object.values(covers)[0];
                      }
                      return (
                        <CardMedia component="img" height="140" image={coverImg} alt={t.name || t.title || 'Trip cover'} />
                      );
                    })()}
                    <CardContent sx={{ position: 'relative' }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <Avatar sx={{ width: 24, height: 24 }}>{(t.name || t.title || 'U')[0]}</Avatar>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ fontSize: { xs: "0.95rem", md: "1rem" } }}>
                          {t.name || t.title || 'Untitled trip'}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: { xs: "0.85rem", md: "0.875rem" } }}>
                        {(t.countries && t.countries.join(', ')) || 'No countries specified'}
                      </Typography>
                      <Chip size="small" label={`${t.countries?.length || 0} countries`} />
                      {/* Edit button, only if user is member or owner */}
                      {(() => {
                        // Assume t.members is array of user ids/emails, t.owner is user id/email
                        // userProfile is from Redux store
                        const userId = userProfile?.id || userProfile?.email;
                        const isOwner = t.owner && userId && t.owner === userId;
                        const isMember = Array.isArray(t.members) && userId && t.members.includes(userId);
                        if (isOwner || isMember) {
                          return (
                            <Button
                              variant="outlined"
                              size="small"
                              sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}
                              onClick={e => {
                                e.stopPropagation();
                                navigate(`/trip/${t.id || t.Id}/edit`);
                              }}
                            >
                              Edit
                            </Button>
                          );
                        }
                        return null;
                      })()}
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
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
