import React from 'react';
import {
  Box,
  Typography,
  Chip,
  InputBase,
  CircularProgress,
  Alert,
  Button,
  Avatar,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { apiServices } from '../../services/APIs/apiServices';

type DiscoverTrip = {
  id: string;
  name: string;
  description: string;
  countries: string[];
  vibe: string;
  imageUrl: string;
  ownerName: string;
  updatedAt: string | null;
};

const WEB_BASE = (import.meta.env.VITE_WEB_BASE_URL || 'https://tripician.com').replace(/\/$/, '');

const normalizeTrip = (raw: any): DiscoverTrip | null => {
  const id = raw?.id || raw?.Id;
  if (!id) return null;

  const owner = raw?.owner || raw?.Owner || {};
  const ownerName =
    owner?.name ||
    owner?.Name ||
    raw?.ownerName ||
    raw?.OwnerName ||
    'Tripician Traveler';

  const countriesRaw = raw?.countries || raw?.Countries || [];
  const countries = Array.isArray(countriesRaw)
    ? countriesRaw.filter((c: unknown) => typeof c === 'string' && c.trim().length > 0)
    : [];

  return {
    id: String(id),
    name: String(raw?.name || raw?.Name || 'Untitled Trip'),
    description: String(raw?.description || raw?.Description || '').trim(),
    countries,
    vibe: String(raw?.vibe || raw?.Vibe || '').trim(),
    imageUrl: String(raw?.bannerPhotoUrl || raw?.BannerPhotoUrl || raw?.imageUrl || raw?.ImageUrl || ''),
    ownerName: String(ownerName),
    updatedAt: raw?.updatedDate || raw?.UpdatedDate || raw?.updatedAt || raw?.UpdatedAt || null,
  };
};

const DiscoveryPage: React.FC = () => {
  const [trips, setTrips] = React.useState<DiscoverTrip[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState('');
  const [activeVibe, setActiveVibe] = React.useState<string>('All');

  React.useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiServices.getPublicTrips();
        if (!active) return;

        const rows = Array.isArray(response?.data) ? response.data : [];
        const mapped = rows
          .map(normalizeTrip)
          .filter((row: DiscoverTrip | null): row is DiscoverTrip => Boolean(row));

        setTrips(mapped);
      } catch {
        if (!active) return;
        setError('Unable to load public trips right now. Please try again shortly.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const vibeOptions = React.useMemo(() => {
    const set = new Set<string>();
    for (const trip of trips) {
      if (trip.vibe) set.add(trip.vibe);
    }
    return ['All', ...Array.from(set).slice(0, 8)];
  }, [trips]);

  const filteredTrips = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    return trips.filter((trip) => {
      const byVibe = activeVibe === 'All' ? true : trip.vibe.toLowerCase() === activeVibe.toLowerCase();
      if (!byVibe) return false;

      if (!q) return true;

      const corpus = [
        trip.name,
        trip.description,
        trip.ownerName,
        trip.vibe,
        ...trip.countries,
      ]
        .join(' ')
        .toLowerCase();

      return corpus.includes(q);
    });
  }, [trips, query, activeVibe]);

  const listSchema = React.useMemo(() => {
    const items = filteredTrips.slice(0, 20).map((trip, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${WEB_BASE}/trip/${trip.id}`,
      name: trip.name,
    }));

    return JSON.stringify(
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Tripician Discover Trips',
        description:
          'Public travel itineraries by the Tripician community. Explore destinations, routes, and travel vibes.',
        url: `${WEB_BASE}/discover`,
        hasPart: {
          '@type': 'ItemList',
          itemListElement: items,
        },
      },
      null,
      2,
    );
  }, [filteredTrips]);

  return (
    <>
      <Helmet>
        <title>Discover Public Trips and Itineraries | Tripician</title>
        <meta
          name="description"
          content="Explore public travel itineraries from the Tripician community. Discover destination ideas, travel vibes, and real trip plans before you build your own."
        />
        <link rel="canonical" href={`${WEB_BASE}/discover`} />
        <meta property="og:title" content="Discover Public Trips and Itineraries | Tripician" />
        <meta
          property="og:description"
          content="Explore public travel itineraries from the Tripician community. Search by destination, vibe, and country."
        />
        <meta property="og:url" content={`${WEB_BASE}/discover`} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="robots" content="index,follow" />
        <script type="application/ld+json">{listSchema}</script>
      </Helmet>

      <Box
        sx={{
          minHeight: '100vh',
          background:
            'radial-gradient(1200px 500px at 10% -10%, rgba(255,56,92,0.18) 0%, rgba(255,56,92,0) 55%), radial-gradient(900px 420px at 100% 0%, rgba(14,165,233,0.16) 0%, rgba(14,165,233,0) 58%), #f6f7fb',
          px: { xs: 2, md: 6 },
          pb: { xs: 8, md: 10 },
        }}
      >
        <Box
          sx={{
            maxWidth: 1200,
            mx: 'auto',
            pt: { xs: 4, md: 6 },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: { xs: 'flex-start', md: 'center' },
              justifyContent: 'space-between',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 2,
              mb: 3,
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: 12,
                  letterSpacing: '0.16em',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: '#d91a50',
                  mb: 0.75,
                }}
              >
                Open Discovery Layer
              </Typography>
              <Typography
                component="h1"
                sx={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontStyle: 'italic',
                  fontWeight: 800,
                  lineHeight: 1.05,
                  fontSize: { xs: '2rem', md: '3rem' },
                  color: '#0f172a',
                }}
              >
                Discover Real Trips
                <br />
                Built By Travelers
              </Typography>
              <Typography sx={{ mt: 1.5, color: '#475569', maxWidth: 760, fontSize: { xs: 14, md: 16 } }}>
                Browse public itineraries, spot destination ideas, and open any trip to see the full route. Your private inputs stay private. Shared inspiration stays public.
              </Typography>
            </Box>

            <Button
              component={Link}
              to="/signup"
              variant="contained"
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: '999px',
                px: 2.5,
                py: 1,
                background: 'linear-gradient(135deg,#ff385c,#d91a50)',
                boxShadow: '0 8px 24px rgba(217,26,80,0.35)',
              }}
            >
              Create Your Trip
            </Button>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' },
              gap: 2,
              mb: 3,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                px: 2,
                py: 1.1,
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.88)',
                border: '1px solid rgba(15,23,42,0.08)',
                boxShadow: '0 8px 24px rgba(2,6,23,0.06)',
              }}
            >
              <SearchRoundedIcon sx={{ color: '#64748b' }} />
              <InputBase
                placeholder="Search by destination, vibe, country, or traveler"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                sx={{ width: '100%', fontSize: 14.5 }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              {vibeOptions.map((vibe) => (
                <Chip
                  key={vibe}
                  label={vibe}
                  onClick={() => setActiveVibe(vibe)}
                  sx={{
                    borderRadius: '999px',
                    fontWeight: 700,
                    background:
                      activeVibe === vibe
                        ? 'linear-gradient(135deg,#ff385c,#d91a50)'
                        : 'rgba(255,255,255,0.88)',
                    color: activeVibe === vibe ? '#fff' : '#334155',
                    border:
                      activeVibe === vibe
                        ? '1px solid transparent'
                        : '1px solid rgba(15,23,42,0.1)',
                  }}
                />
              ))}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5, color: '#64748b' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PublicRoundedIcon sx={{ fontSize: 18 }} />
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                {filteredTrips.length} public trip{filteredTrips.length === 1 ? '' : 's'}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 13 }}>
              Crawlable trip links and SEO metadata enabled.
            </Typography>
          </Box>

          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 10 }}>
              <CircularProgress size={28} />
            </Box>
          )}

          {!loading && error && (
            <Alert severity="warning" sx={{ borderRadius: 2.5 }}>
              {error}
            </Alert>
          )}

          {!loading && !error && filteredTrips.length === 0 && (
            <Alert severity="info" sx={{ borderRadius: 2.5 }}>
              No matching public trips found. Try a different keyword or vibe.
            </Alert>
          )}

          {!loading && !error && filteredTrips.length > 0 && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  lg: 'repeat(3, minmax(0, 1fr))',
                },
                gap: 2,
              }}
            >
              {filteredTrips.map((trip) => {
                const excerpt = trip.description
                  ? trip.description.slice(0, 148) + (trip.description.length > 148 ? '...' : '')
                  : 'Open this itinerary to explore the route, destinations, and overall travel style.';

                return (
                  <Box
                    key={trip.id}
                    component={Link}
                    to={`/trip/${trip.id}`}
                    sx={{
                      textDecoration: 'none',
                      borderRadius: 3,
                      overflow: 'hidden',
                      background: 'rgba(255,255,255,0.94)',
                      border: '1px solid rgba(15,23,42,0.08)',
                      boxShadow: '0 10px 26px rgba(2,6,23,0.08)',
                      transition: 'transform .22s ease, box-shadow .22s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 16px 34px rgba(2,6,23,0.12)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        height: 170,
                        background: trip.imageUrl
                          ? `linear-gradient(180deg, rgba(15,23,42,0.15), rgba(15,23,42,0.55)), url(${trip.imageUrl}) center/cover no-repeat`
                          : 'linear-gradient(135deg,#ffedd5,#fecdd3)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        p: 1.25,
                      }}
                    >
                      <Chip
                        size="small"
                        icon={<ExploreRoundedIcon sx={{ fontSize: 14 }} />}
                        label={trip.vibe || 'General'}
                        sx={{
                          bgcolor: 'rgba(15,23,42,0.58)',
                          color: '#fff',
                          fontWeight: 700,
                          borderRadius: '999px',
                          '& .MuiChip-icon': { color: '#fff' },
                        }}
                      />
                    </Box>

                    <Box sx={{ p: 1.8 }}>
                      <Typography
                        sx={{
                          fontSize: 18,
                          fontWeight: 800,
                          color: '#0f172a',
                          lineHeight: 1.2,
                          mb: 1,
                        }}
                      >
                        {trip.name}
                      </Typography>

                      <Typography sx={{ fontSize: 13.5, color: '#475569', lineHeight: 1.55, minHeight: 64 }}>
                        {excerpt}
                      </Typography>

                      {trip.countries.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1.25 }}>
                          {trip.countries.slice(0, 3).map((country) => (
                            <Chip
                              key={`${trip.id}-${country}`}
                              label={country}
                              size="small"
                              sx={{
                                borderRadius: '999px',
                                bgcolor: 'rgba(14,165,233,0.1)',
                                color: '#0c4a6e',
                                fontWeight: 700,
                              }}
                            />
                          ))}
                          {trip.countries.length > 3 && (
                            <Chip
                              label={`+${trip.countries.length - 3}`}
                              size="small"
                              sx={{ borderRadius: '999px', bgcolor: 'rgba(15,23,42,0.08)', color: '#334155' }}
                            />
                          )}
                        </Box>
                      )}

                      <Box sx={{ mt: 1.75, pt: 1.3, borderTop: '1px dashed rgba(15,23,42,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 26, height: 26, fontSize: 12, bgcolor: '#ff385c' }}>
                            {trip.ownerName.charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography sx={{ fontSize: 12.5, color: '#334155', fontWeight: 700 }}>
                            {trip.ownerName}
                          </Typography>
                        </Box>

                        {trip.updatedAt && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#64748b' }}>
                            <CalendarTodayRoundedIcon sx={{ fontSize: 13 }} />
                            <Typography sx={{ fontSize: 11.5 }}>
                              {new Date(trip.updatedAt).toLocaleDateString()}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </Box>
    </>
  );
};

export default DiscoveryPage;
