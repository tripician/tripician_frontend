import React from 'react';
import {
  Box,
  Typography,
  Chip,
  InputBase,
  Alert,
  Button,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { IconCompass, IconSearch, IconWorld } from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { apiServices } from '../../services/APIs/apiServices';
import CommunityTripCard from '../CommunityPage/CommunityTripCard';
import { tripPath } from '../../utils/tripSlug';
import EmptyState from '../../components/ui/EmptyState';
import { CardGridSkeleton } from '../../components/ui/Skeletons';

const WEB_BASE = (import.meta.env.VITE_WEB_BASE_URL || 'https://tripician.com').replace(/\/$/, '');

const tripId = (raw: any): string | null => {
  const id = raw?.id || raw?.Id;
  return id ? String(id) : null;
};
const tripName = (raw: any) => String(raw?.name || raw?.Name || 'Untitled Trip');
const tripVibe = (raw: any) => String(raw?.vibe || raw?.Vibe || '').trim();
const tripCountries = (raw: any): string[] => {
  const c = raw?.countries || raw?.Countries || [];
  return Array.isArray(c) ? c.filter((x: unknown) => typeof x === 'string' && x.trim().length > 0) : [];
};
const tripOwnerName = (raw: any) =>
  raw?.owner?.name || raw?.Owner?.Name || raw?.ownerName || raw?.OwnerName || 'Tripician Traveler';

const DiscoveryPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [trips, setTrips] = React.useState<any[]>([]);
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
        setTrips(rows.filter((row: any) => tripId(row)));
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
      const v = tripVibe(trip);
      if (v) set.add(v);
    }
    return ['All', ...Array.from(set).slice(0, 8)];
  }, [trips]);

  const filteredTrips = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    return trips.filter((trip) => {
      const vibe = tripVibe(trip);
      const byVibe = activeVibe === 'All' ? true : vibe.toLowerCase() === activeVibe.toLowerCase();
      if (!byVibe) return false;

      if (!q) return true;

      const corpus = [
        tripName(trip),
        trip.description || trip.Description || '',
        tripOwnerName(trip),
        vibe,
        ...tripCountries(trip),
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
      url: `${WEB_BASE}${tripPath({ id: tripId(trip) || '', name: tripName(trip) })}`,
      name: tripName(trip),
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

      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 4, md: 6 }, pb: 10 }}>

          {/* Page header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: { xs: 'flex-start', md: 'flex-end' },
              justifyContent: 'space-between',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 2,
            }}
          >
            <Box>
              <Typography
                component="h1"
                sx={{
                  fontFamily: theme.custom.fontDisplay,
                  fontWeight: 700,
                  fontSize: { xs: '1.9rem', md: '2.4rem' },
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                  color: 'text.primary',
                }}
              >
                Discover
              </Typography>
              <Typography sx={{ mt: 1, fontSize: 15, color: 'text.secondary', maxWidth: 560 }}>
                Public trips from the Tripician community - open any itinerary to see the full route, stops, and story.
              </Typography>
            </Box>
            <Button component={Link} to="/signup" variant="contained">
              Create your trip
            </Button>
          </Box>

          {/* Toolbar: vibe chips + search */}
          <Box
            sx={{
              mt: { xs: 3, md: 4 },
              display: 'flex',
              gap: 1.5,
              flexDirection: { xs: 'column-reverse', md: 'row' },
              alignItems: { xs: 'stretch', md: 'center' },
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{
              display: 'flex', gap: 1, minWidth: 0, overflowX: 'auto', pb: 0.5,
              '::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none',
            }}>
              {vibeOptions.map((vibe) => (
                <Chip
                  key={vibe}
                  label={vibe}
                  onClick={() => setActiveVibe(vibe)}
                  sx={{
                    borderRadius: 999, height: 34, flexShrink: 0,
                    fontWeight: 600, fontSize: 13,
                    bgcolor: activeVibe === vibe ? 'text.primary' : 'background.paper',
                    color: activeVibe === vibe ? 'background.paper' : 'text.secondary',
                    border: `1px solid ${activeVibe === vibe ? 'transparent' : theme.custom.surface.border}`,
                    '&:hover': { bgcolor: activeVibe === vibe ? 'text.primary' : theme.custom.surface.hover },
                  }}
                />
              ))}
            </Box>
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1.25,
              height: 42, px: 2, borderRadius: 999,
              border: `1px solid ${theme.custom.surface.border}`,
              bgcolor: 'background.paper',
              width: { xs: '100%', md: 320 }, flexShrink: 0,
              transition: `box-shadow ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}, border-color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
              '&:focus-within': {
                borderColor: 'primary.main',
                boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.14)}`,
              },
            }}>
              <IconSearch size={17} stroke={1.9} color={theme.palette.text.disabled} style={{ flexShrink: 0 }} />
              <InputBase
                fullWidth
                placeholder="Search destinations, vibes, travelers…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                sx={{ fontSize: 14, fontWeight: 500 }}
              />
            </Box>
          </Box>

          {/* Result count */}
          {!loading && !error && filteredTrips.length > 0 && (
            <Box sx={{ mt: 3, mb: 2, display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary' }}>
              <IconWorld size={16} stroke={1.9} />
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                {filteredTrips.length} public trip{filteredTrips.length === 1 ? '' : 's'}
              </Typography>
            </Box>
          )}

          {loading && (
            <Box sx={{ mt: 4 }}>
              <CardGridSkeleton count={6} minWidth={300} />
            </Box>
          )}

          {!loading && error && (
            <Alert severity="warning" sx={{ mt: 4, borderRadius: 2.5 }}>
              {error}
            </Alert>
          )}

          {!loading && !error && filteredTrips.length === 0 && (
            <EmptyState
              icon={IconCompass}
              title="No trips found"
              description="Try a different search term, or clear the filters to see every public itinerary."
              actionLabel={query.trim() || activeVibe !== 'All' ? 'Clear filters' : undefined}
              onAction={() => { setQuery(''); setActiveVibe('All'); }}
            />
          )}

          {!loading && !error && filteredTrips.length > 0 && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'minmax(0, 1fr)',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  lg: 'repeat(3, minmax(0, 1fr))',
                },
                gap: 3,
              }}
            >
              {filteredTrips.map((trip, i) => (
                <CommunityTripCard
                  key={tripId(trip) || i}
                  trip={trip}
                  onClick={() => {
                    const id = tripId(trip);
                    if (id) navigate(tripPath({ id, name: tripName(trip) }), { state: { trip } });
                  }}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </>
  );
};

export default DiscoveryPage;
