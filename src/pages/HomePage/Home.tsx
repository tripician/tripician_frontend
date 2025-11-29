import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Card, CardContent, CardMedia, Button, CircularProgress, Alert, IconButton, Tooltip } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import TopBar from '../PageLayout/CommonLayouts/TopBar';
import { useNavigate } from 'react-router-dom';
import { apiServices } from '../../services/APIs/apiServices';
import TravelMap from '../../components/ProfileComponents/TravelMap';

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
        if(active){
          setPublicTrips(response.data || []);
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

  const [mapCollapsed, setMapCollapsed] = useState(false);
  const [mapWidth, setMapWidth] = useState(0.35); // fraction of total width
  const containerRef = useRef<HTMLDivElement | null>(null);
  const resizingRef = useRef(false);

  const startResize = (e: React.MouseEvent) => {
    if (mapCollapsed) return; // only resize when expanded
    resizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  };
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!resizingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const fraction = relativeX / rect.width;
      const clamped = Math.min(0.65, Math.max(0.20, fraction));
      setMapWidth(clamped);
    };
    const up = () => {
      if (resizingRef.current) {
        resizingRef.current = false;
        document.body.style.cursor = 'default';
      }
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, []);

  const toggleCollapse = () => setMapCollapsed(c => !c);

  // Map status arrays (single source for overlay + TravelMap)
  const visitedCountries = ["USA", "IND", "SGP"];
  const plannedCountries = ["FRA", "DEU"];
  const upcomingCountries = ["AUS"];
  const progressPercent = Math.round((visitedCountries.length / (visitedCountries.length + plannedCountries.length + upcomingCountries.length)) * 100);

  return (
    <Box ref={containerRef} sx={{ width: '100%', backgroundColor: 'background.default', minHeight: 'calc(100vh - 100px)', display:'flex', flexDirection:'column' }}>
      <TopBar />
      <Box sx={{ flex:1,  display:'flex', flexDirection:'row', position:'relative' }}>
        {/* LEFT CONTENT AREA */}
        <Box sx={{ flexGrow:1, width: '60%',px:4, py:3, overflow:'auto' }}>
        {/* Featured Destinations */}
        <Box sx={{ pb: 6 }}>
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
        <Box sx={{ mt:2 }}>
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
          mx: 0,
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
        {/* SPLITTER */}
        <Box
          onMouseDown={startResize}
          sx={{ width: '50px', cursor: mapCollapsed ? 'pointer':'col-resize', background: 'transparent', position:'relative' }}
        >
          <Box sx={{ position:'absolute', top:8, left:-6, display:'flex', flexDirection:'column', gap:1 }}>
            <Tooltip title={mapCollapsed ? 'Expand map' : 'Collapse map'}>
              <IconButton size='small' onClick={toggleCollapse} sx={{ bgcolor:'background.paper', boxShadow:1 }}>
                {mapCollapsed ? <ChevronRightIcon fontSize='small' /> : <ChevronLeftIcon fontSize='small' />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        {/* RIGHT MAP PANEL */}
        <Box sx={{
          width: mapCollapsed ? 0 : `${Math.round(mapWidth*100)}%`,
          transition: 'width .25s ease',
          borderLeft: 1,
          borderColor: 'divider',
          position:'relative',
          display: mapCollapsed ? 'none':'flex',
          flexDirection:'column',
          p:0,
        }}>
          <Box sx={{ flex:1, position:'relative', overflow:'hidden', background: 'transparent' }}>
            {/* Status overlay */}
            <Box sx={(theme) => ({
              width:'90%',
              position:'absolute',
              top:8,
              left:'50%',
              transform:'translateX(-50%)',
              display:'flex',
              gap:2,
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(25, 25, 25, 0.75)' : 'rgba(255, 255, 255, 0.82)',
              backdropFilter:'blur(6px)',
              borderRadius:4,
              px:2,
              py:0.75,
              boxShadow:2,
              alignItems:'center',
              zIndex:10,
              border: '1px solid',
              borderColor: theme.palette.divider,
            })}>
              <Tooltip title={visitedCountries.length ? visitedCountries.join(', ') : 'No completed countries'} arrow>
                <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                  <Box sx={{ width:12, height:12, borderRadius:2, background:'#0B5F89' }} />
                  <Typography variant='caption' sx={{ fontWeight:500, color:'text.primary' }}>
                    Completed: {visitedCountries.length}
                  </Typography>
                </Box>
              </Tooltip>
              <Tooltip title={plannedCountries.length ? plannedCountries.join(', ') : 'No planned countries'} arrow>
                <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                  <Box sx={{ width:12, height:12, borderRadius:2, background:'#2B89C7' }} />
                  <Typography variant='caption' sx={{ fontWeight:500, color:'text.primary' }}>
                    Planned: {plannedCountries.length}
                  </Typography>
                </Box>
              </Tooltip>
              {/* Completion bar */}
              <Box sx={{ display:'flex', alignItems:'center', gap:1, ml:1 }}>
                <Typography variant='caption' sx={{ opacity:0.7 }}>Progress</Typography>
                <Box sx={{ width:100, height:6, borderRadius:3, bgcolor:'rgba(0,0,0,0.15)', overflow:'hidden' }}>
                  <Box sx={{ width:`${progressPercent}%`, height:'100%', bgcolor:'#0B5F89' }} />
                </Box>
              </Box>
            </Box>
            <Box sx={{ mt:10}}>
              <TravelMap
                visited={visitedCountries}
                planned={plannedCountries}
                upcoming={upcomingCountries}
                autoRotate={true}
                rotationSpeedDegPerSec={3}
                disableAttribution={true}
                persistUserControl={true}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Home;
