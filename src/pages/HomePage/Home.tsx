import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, CardMedia, Button, CircularProgress, Alert, Stack, Avatar, Chip } from '@mui/material';
import { useSelector } from 'react-redux';
import ExploreIcon from '@mui/icons-material/TravelExplore';
import PublicIcon from '@mui/icons-material/Public';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TopBar from '../PageLayout/CommonLayouts/TopBar';
import { useNavigate } from 'react-router-dom';
import { apiServices } from '../../services/APIs/apiServices';
import TravelMap from '../../components/TravelMap';
import covers from '../../assets/covers.json';
import { TravelExplore } from '@mui/icons-material';
import TripCreationModal from '../../components/CreateTripComponents/TripCreationModal';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { countryAlpha3FromCode, countryAlpha3FromName, countryNameFromCode, countryCodeFromName } from '../../utils/countryFlags';

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
  const [userTripsLoading, setUserTripsLoading] = useState(false);
  const [userTripsError, setUserTripsError] = useState<string | null>(null);

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

  const { visitedNames, plannedNames, upcomingNames, visitedAlpha3, plannedAlpha3, upcomingAlpha3 } = tripGeography;

  const visitedCountries = visitedAlpha3;
  const plannedCountries = plannedAlpha3;
  const upcomingCountries = upcomingAlpha3;

  const nextDestinationName = upcomingNames[0] || plannedNames[0] || visitedNames[0];
  const nextDestinationLabel = nextDestinationName ?? 'somewhere new';
  const visitedCount = visitedNames.length;
  const plannedCount = plannedNames.length;
  const upcomingCount = upcomingNames.length;

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

  const [currentStatusMessages, setCurrentStatusMessages] = useState(() => statusMessages[0] ?? { title: '', subtitle: '' });
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

      {/* HERO SECTION */}
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 4, md: 6 }, pb: 4, position: 'relative', zIndex: 2 }}>
        <Box sx={{ 
          display: "flex", 
          alignItems: "flex-start", 
          justifyContent: "space-between", 
          py: { xs: 3, md: 5 }, 
          px: { xs: 1, sm: 2 }, 
          gap: 4, 
          position: "relative",
          flexDirection: { xs: 'column', lg: 'row' }
        }}>
          <Box sx={{ 
            maxWidth: { xs: '100%', lg: 650 },
            width: '100%',
            zIndex: 10
          }}>
            
            {/* Big Personal Greeting */}
            <Typography
              variant="h1"
              fontWeight={800}
              sx={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: { xs: "2.2rem", sm: "3rem", md: "3.8rem", lg: "5rem" },
                color: "text.primary",
                lineHeight: 1.05,
                mb: 1,
                letterSpacing: "-1px",
              }}
            >
              Hi, {userFirstName}! 👋
            </Typography>

            {/* Mini motivational travel quote */}
            <Typography
              variant="body1"
              sx={{
                mb: 4,
                fontSize: { xs: "0.95rem", md: "1.05rem" },
                opacity: 0.75,
                fontStyle: "italic",
              }}
            >
              {currentMotivation.title}
            </Typography>

            <Typography
              variant="h5"
              sx={{
                mb: 1,
                fontWeight: 700,
                color: "#004170ff",
                fontSize: { xs: "1.1rem", sm: "1.3rem", md: "1.5rem" }
            }}
            >
              {currentStatusMessages.title}
            </Typography>

            <Typography
              variant="body1"
              sx={{ 
                color: "text.secondary", 
                mb: 4,
                fontSize: { xs: "0.9rem", md: "1rem" }
              }}
            >
              {currentStatusMessages.subtitle}
            </Typography>

            {/* Buttons */}
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={2}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              <Button
                variant="contained"
                size="large"
                startIcon={<ExploreIcon />}
                onClick={handleExploreTrips}
                sx={{
                  px: 3,
                  py: 1.2,
                  borderRadius: 3,
                  textTransform: "none",
                  fontSize: { xs: "0.9rem", md: "1rem" },
                  width: { xs: '100%', sm: 'auto' }
                }}
              >
                Start Planning a new trip
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<PublicIcon />}
                onClick={handleExploreDashboard}
                sx={{
                  px: 3,
                  py: 1.2,
                  borderRadius: 3,
                  textTransform: "none",
                  fontSize: { xs: "0.9rem", md: "1rem" },
                  width: { xs: '100%', sm: 'auto' }
                }}
              >
                Explore dashboard
              </Button>
            </Stack>

            {userTripsLoading && (
              <Box
                sx={{
                  mt: 2,
                  display: { xs: 'flex', lg: 'none' },
                  alignItems: 'center',
                  gap: 1,
                  color: 'text.secondary'
                }}
              >
                <CircularProgress size={18} thickness={4} />
                <Typography variant="body2">Syncing your trips...</Typography>
              </Box>
            )}

            {userTripsError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {userTripsError}
              </Alert>
            )}

          </Box>

          {/* MAPBOX GLOBE OVERLAY - Hidden on mobile and tablet */}
          <Box
            sx={{
              display: { xs: 'none', lg: 'block' },
              position: { lg: 'absolute' },
              top: { lg: -40 },
              right: { lg: 40 },
              width: { lg: 500 },
              height: { lg: 500 },
              zIndex: 3,
              flexShrink: 0,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {userTripsLoading && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.7)',
                  borderRadius: '50%'
                }}
              >
                <CircularProgress size={48} thickness={4} />
              </Box>
            )}
            <TravelMap
              visited={visitedCountries}
              planned={plannedCountries}
              upcoming={upcomingCountries}
              autoRotate={true}
              rotationSpeedDegPerSec={3}
              disableAttribution={true}
            />
          </Box>
        </Box>

        {/* BLUE BLOB - Adjusted for mobile */}
        <Box
          sx={{
            position: "absolute",
            top: { xs: -100, md: -200 },
            right: { xs: -60, md: -120 },
            width: { xs: 600, md: 900 },
            height: { xs: 600, md: 900 },
            borderRadius: "50%",
            background:
              "radial-gradient(closest-side, rgba(46,128,255,0.25), rgba(46,128,255,0.08))",
            filter: "blur(60px)",
            zIndex: 1,
            pointerEvents: "none"
          }}
        />
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
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 4 }}>
              <TrendingUpIcon sx={{ color: '#FF6B6B', fontSize: 32 }} />
              <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: "1.6rem", md: "2.1rem" } }}>
                Trending Destinations
              </Typography>
            </Stack>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {featuredDestinations.map(destination => (
                <Card key={destination.id} sx={{
                  width: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(25% - 18px)' },
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 3,
                  overflow: 'hidden',
                  transition: 'all .25s ease',
                  boxShadow: 2,
                  minHeight: 320,
                  position: 'relative', // Ensure badge overlays correctly
                  '&:hover': { transform: 'translateY(-6px)', boxShadow: 6, cursor: 'pointer', }
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
                  <CardMedia component="img" height="200" image={destination.image} alt={destination.title} />
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
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 4 }}>
            <TravelExplore sx={{ color: '#004d8bff', fontSize: 32 }} />
            <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: "1.6rem", md: "2.1rem" } }}>
              Community Adventures
            </Typography>
          </Stack>

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
            py: 6,
            px: 4,
            backgroundColor: 'background.paper',
            borderRadius: 2,
            boxShadow: 1,
            mb: 4
          }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: "1.5rem", md: "2rem" } }}>
              Ready to Start Planning?
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary', fontSize: { xs: "0.9rem", md: "1rem" } }}>
              Create your first trip and invite your friends.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={handleExploreTrips}
              sx={{ fontWeight: 'bold', px: 4, py: 1.5 }}
            >
              Get Started
            </Button>
          </Box>
        </Box>
      </Box>
      <TripCreationModal open={createTripOpen} onClose={() => setCreateTripOpen(false)} />
    </Box>
  );
};

export default Home;
