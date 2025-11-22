import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, CardMedia, Button, CircularProgress, Alert } from '@mui/material';
import TopBar from '../PageLayout/CommonLayouts/TopBar';
import { useNavigate } from 'react-router-dom';
import { apiServices } from '../../services/APIs/apiServices';

// Import destination images
import santorini from '../../assets/santorini.png';
import kyoto from '../../assets/kyoto.png';
import paris from '../../assets/paris.png';
import dubai from '../../assets/dubai.png';

const Home: React.FC = () => {
  const navigate = useNavigate();
  // NavigationPanel will internally manage selected item and TopBar no longer needs a prop.

  // Featured destinations data
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
      description: 'Fall in love with the City of Light and its timeless romantic charm.',
      image: paris,
    },
    {
      id: 4,
      title: 'Dubai, UAE',
      description: 'Experience luxury and modern architecture in this desert metropolis.',
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
      setPublicError(null);
      try {
        const resp = await apiServices.getPublicTrips();
        if(active){
          setPublicTrips(resp.data || []);
        }
      } catch(err: any){
        if(active){
          console.error('[Home] fetch public trips failed', err);
          setPublicError(err?.response?.data?.message || 'Failed to load public trips');
        }
      } finally {
        if(active) setLoadingPublic(false);
      }
    };
    fetchPublic();
    return () => { active = false; };
  }, []);

  const handleExploreTrips = () => {
    navigate('/profile');
  };

  return (
      <Box sx={{ width: "100%", backgroundColor: "background.default", minHeight: "calc(100vh - 100px)" }}>
        <TopBar />

        {/* Featured Destinations */}
        <Box sx={{ px: 4, pb: 6, mt: 3 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mb: 4 }}>
            Featured Destinations
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {featuredDestinations.map((destination) => (
              <Card key={destination.id} sx={{ 
                width: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(25% - 18px)' },
                display: 'flex', 
                flexDirection: 'column',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  transition: 'all 0.3s ease-in-out',
                  boxShadow: 3,
                }
              }}>
                <CardMedia
                  component="img"
                  height="200"
                  image={destination.image}
                  alt={destination.title}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h6" component="div" fontWeight="bold">
                    {destination.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {destination.description}
                  </Typography>
                </CardContent>
              </Card>
            ))}
        </Box>
        </Box>

        {/* Public Trips */}
        <Box sx={{ px:4, mt:2 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
            Public Trips
          </Typography>
          {loadingPublic && (
            <Box sx={{ display:'flex', justifyContent:'center', py:4 }}>
              <CircularProgress size={32} />
            </Box>
          )}
          {publicError && !loadingPublic && (
            <Alert severity='error' sx={{ mb:2 }}>{publicError}</Alert>
          )}
          {!loadingPublic && !publicError && publicTrips.length === 0 && (
            <Typography variant='body2' sx={{ color:'text.secondary', mb:4 }}>No public trips yet.</Typography>
          )}
          {!loadingPublic && !publicError && (
            <Box sx={{ display:'flex', flexWrap:'wrap', gap:3, mb:4 }}>
              {publicTrips.map(t => (
                <Card key={t.id || t.Id} sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(25% - 18px)' } }}>
                  <CardContent>
                    <Typography variant='h6' fontWeight='bold' gutterBottom>{t.name || t.title || 'Untitled trip'}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {(t.countries && t.countries.join(', ')) || 'No countries specified'}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Box>

        {/* Call to Action */}
        <Box sx={{ 
          textAlign: 'center', 
          py: 6, 
          px: 4,
          backgroundColor: 'background.paper',
          borderRadius: 2,
          mx: 4,
          mb: 4,
          boxShadow: 1
        }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Ready to Start Planning?
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
            Create your first trip and invite your friends to join the adventure.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleExploreTrips}
            sx={{
              backgroundColor: 'secondary.main',
              fontWeight: 'bold',
              px: 4,
              py: 1.5,
              '&:hover': {
                backgroundColor: 'secondary.dark',
              },
            }}
          >
            Get Started
          </Button>
        </Box>
      </Box>
  );
};

export default Home;
