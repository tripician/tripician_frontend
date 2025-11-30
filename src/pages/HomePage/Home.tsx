import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, CardMedia, Button, CircularProgress, Alert, Stack, Divider, Avatar, Chip } from '@mui/material';
import { useSelector } from 'react-redux';
import ExploreIcon from '@mui/icons-material/TravelExplore';
import PublicIcon from '@mui/icons-material/Public';
import TopBar from '../PageLayout/CommonLayouts/TopBar';
import { useNavigate } from 'react-router-dom';
import { apiServices } from '../../services/APIs/apiServices';
import TravelMap from '../../components/ProfileComponents/TravelMap';

import santorini from '../../assets/santorini.png';
import kyoto from '../../assets/kyoto.png';
import paris from '../../assets/paris.png';
import dubai from '../../assets/dubai.png';

const Home: React.FC = () => {
  const navigate = useNavigate();

  const featuredDestinations = [
    {
      id: 1,
      title: 'Santorini, Greece',
      description: 'Experience the stunning sunsets and white-washed buildings of this iconic Greek island.',
      image: santorini,
    },
    {
      id: 2,
      title: 'Kyoto, Japan',
      description: 'Discover the ancient temples and traditional culture of Japan\'s former capital.',
      image: kyoto,
    },
    {
      id: 3,
      title: 'Paris, France',
      description: 'Explore the city of lights and its romantic charm.',
      image: paris,
    },
    {
      id: 4,
      title: 'Dubai, UAE',
      description: 'Experience luxury and modern architecture in the desert.',
      image: dubai,
    },
  ];

  const [publicTrips, setPublicTrips] = useState<any[]>([]);
  const [loadingPublic, setLoadingPublic] = useState(false);
  const [publicError, setPublicError] = useState<string | null>(null);

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

  const handleExploreTrips = () => {
    navigate('/profile');
  };

  const visitedCountries = ["USA", "IND", "SGP"];
  const plannedCountries = ["FRA", "DEU"];
  const upcomingCountries = ["AUS"];

  // Next destination selection: prefer upcoming; fallback to planned; else visited
  const nextDestination = upcomingCountries[0] || plannedCountries[0] || visitedCountries[0] || '—';

  // User profile from store
  const userProfile = useSelector((state: any) => state.user?.profile);
  const userFirstName = userProfile?.fname || userProfile?.email?.split('@')[0] || 'Explorer';


  const motivationalQuotes = [
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
  ];

  // MOTIVATIONAL MESSAGES
  const statusMessages = [
    {
      title: `Your adventure is calling… and it begins in ${nextDestination}.`,
      subtitle: "Let’s make this one unforgettable."
    },
    {
      title: `You are a traveloholic, you already have explored ${visitedCountries.length} countries.`,
      subtitle: "Keep your passport ready!"
    },
    {
      title: `You are a great travel planner, more than ${plannedCountries.length} trips lined up!`,
      subtitle: "Plan smart, travel far."
    },
    {
      title: `Exciting journeys await! Your next stop: ${nextDestination}.`,
      subtitle: "Get ready to explore the unknown."
    },
    {
      title: `The world is your playground — ${visitedCountries.length} countries down and many more to go!`,
      subtitle: "Adventure is out there!"
    },
    {
      title: `Your travel diary is growing with ${plannedCountries.length} planned trips!`,
      subtitle: "Let's make them epic."
    },
    {
      title: `Upcoming destination: ${nextDestination}. Are you packed yet?`,
      subtitle: "Time to make memories."
    },
    {
      title: `You've conquered ${visitedCountries.length} countries already!`,
      subtitle: "And many more await your footsteps."
    },
    {
      title: `Your travel streak is unstoppable — ${plannedCountries.length} trips in pipeline!`,
      subtitle: "Adventure awaits!"
    },
    {
      title: `Ready for new horizons? Next destination: ${nextDestination}.`,
      subtitle: "Make every trip count."
    },
  ];

  const [currentStatusMessages, setCurrentStatusMessages] = useState(statusMessages[0]);
  const [currentMotivation, setCurrentMotivation] = useState({ title: motivationalQuotes[0] });

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * statusMessages.length);
    setCurrentStatusMessages(statusMessages[randomIndex]);

    const randomMotivationIndex = Math.floor(Math.random() * motivationalQuotes.length);
    setCurrentMotivation({ title: motivationalQuotes[randomMotivationIndex] });

  }, []);

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
      <Box sx={{ px: 4, pt: 6, pb: 4, position: 'relative', zIndex: 2 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", py: 5, px: 2, gap: 4, position: "relative" }}>
          <Box sx={{ maxWidth: 650 }}>
            
            {/* Big Personal Greeting */}
            <Typography
              variant="h1"
              fontWeight={800}
              sx={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: { xs: "2.8rem", sm: "3.8rem", md: "4.5rem", lg: "5rem" },
                fontcolor: "text.primary",
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
                fontSize: "1.05rem",
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
              }}
            >
              {currentStatusMessages.title}
            </Typography>

            <Typography
              variant="body1"
              sx={{ color: "text.secondary", mb: 4 }}
            >
              {currentStatusMessages.subtitle}
            </Typography>

            {/* Buttons */}
            <Stack direction="row" spacing={2}>
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
                  fontSize: "1rem",
                }}
              >
                Start Planning a new trip
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<PublicIcon />}
                onClick={handleExploreTrips}
                sx={{
                  px: 3,
                  py: 1.2,
                  borderRadius: 3,
                  textTransform: "none",
                  fontSize: "1rem",
                }}
              >
                Explore dashboard
              </Button>
            </Stack>

          </Box>
        </Box>

        {/* BLUE BLOB */}
        <Box
          sx={{
            position: "absolute",
            top: -200,
            right: -120,
            width: 900,
            height: 900,
            borderRadius: "50%",
            background:
              "radial-gradient(closest-side, rgba(46,128,255,0.25), rgba(46,128,255,0.08))",
            filter: "blur(60px)",
            zIndex: 1,
            pointerEvents: "none"
          }}
        />

        {/* MAPBOX GLOBE OVERLAY */}
        <Box
          sx={{
            position: "absolute",
            top: -40,
            right: 40,
            width: 500,
            height: 500,
            zIndex: 3
          }}
        >
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

      {/* MAIN BODY */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'row', position: 'relative', px: 4, pb: 6, gap: 3, zIndex: 2 }}>
        {/* LEFT CONTENT */}
        <Box sx={{ flexGrow: 1, width: { xs: '100%', md: '65%' }, overflow: 'auto' }}>
          {/* FEATURED DESTINATIONS */}
          <Box sx={{ pb: 6 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mb: 4 }}>
              Featured Destinations
            </Typography>
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
                  '&:hover': { transform: 'translateY(-6px)', boxShadow: 6 }
                }}>
                  <CardMedia component="img" height="200" image={destination.image} alt={destination.title} />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography gutterBottom variant="h6" fontWeight="bold">{destination.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{destination.description}</Typography>
                    <Button variant="outlined" size="small" sx={{ mt: 2 }} startIcon={<ExploreIcon />}>
                      Explore Now
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>

          {/* PUBLIC TRIPS */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
              Public Trips
            </Typography>

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
                  <Card key={t.id || t.Id} sx={{
                    width: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(25% - 18px)' },
                    borderRadius: 3,
                    boxShadow: 2,
                    transition: 'all .2s ease',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: 5 }
                  }}>
                    <CardContent>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <Avatar sx={{ width: 24, height: 24 }}>{(t.name || t.title || 'U')[0]}</Avatar>
                        <Typography variant="subtitle1" fontWeight="bold">{t.name || t.title || 'Untitled trip'}</Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {(t.countries && t.countries.join(', ')) || 'No countries specified'}
                      </Typography>
                      <Chip size="small" label={`${t.countries?.length || 0} countries`} />
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
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Ready to Start Planning?
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
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
    </Box>
  );
};

export default Home;
