import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, CardMedia, Button } from '@mui/material';
import NavigationPannel from '../PageLayout/CommonLayouts/NavigationPannel';
import TopBar from '../PageLayout/CommonLayouts/TopBar';
import { useNavigate } from 'react-router-dom';

// Import destination images
import santorini from '../../../assets/santorini.png';
import kyoto from '../../../assets/kyoto.png';
import paris from '../../../assets/paris.png';
import dubai from '../../../assets/dubai.png';

const Home: React.FC = () => {
  const [selectedMenuItem, setSelectedMenuItem] = useState('Home');
  const navigate = useNavigate();

  const handleMenuItemChange = (itemName: string) => {
    setSelectedMenuItem(itemName);
  };

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

  const handleExploreTrips = () => {
    navigate('/profile');
  };

  return (
    <NavigationPannel onMenuItemChange={handleMenuItemChange}>
      <Box sx={{ width: "100%", backgroundColor: "#f5f5f5", minHeight: "calc(100vh - 100px)" }}>
        <TopBar selectedMenuItem={selectedMenuItem} />
        
        {/* Hero Section */}
        <Box sx={{ 
          textAlign: 'center', 
          py: 6, 
          px: 4,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          mb: 4
        }}>
          <Typography variant="h2" fontWeight="bold" gutterBottom>
            Welcome to Tripician
          </Typography>
          <Typography variant="h5" sx={{ mb: 4, opacity: 0.9 }}>
            Plan your perfect trip with friends and family
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleExploreTrips}
            sx={{
              backgroundColor: 'white',
              color: '#667eea',
              fontWeight: 'bold',
              px: 4,
              py: 1.5,
              '&:hover': {
                backgroundColor: '#f5f5f5',
              },
            }}
          >
            Explore Trips
          </Button>
        </Box>

        {/* Featured Destinations */}
        <Box sx={{ px: 4, pb: 6 }}>
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

        {/* Call to Action */}
        <Box sx={{ 
          textAlign: 'center', 
          py: 6, 
          px: 4,
          backgroundColor: '#ffffff',
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
              backgroundColor: '#008bbdff',
              fontWeight: 'bold',
              px: 4,
              py: 1.5,
              '&:hover': {
                backgroundColor: '#006d94',
              },
            }}
          >
            Get Started
          </Button>
        </Box>
      </Box>
    </NavigationPannel>
  );
};

export default Home;
