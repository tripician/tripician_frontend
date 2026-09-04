import React from 'react';
import { Avatar, Box, Button, Skeleton, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRequireAuth } from '../../auth/AuthGate';
import { IconCheck, IconUserPlus, IconUsers } from '@tabler/icons-react';
import SearchField from '../../components/ui/SearchField';
import FilterChip from '../../components/ui/FilterChip';
import EmptyState from '../../components/ui/EmptyState';
import ChipRail from '../../components/ui/ChipRail';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { apiServices } from '../../services/APIs/apiServices';
import { VIBES } from '../CommunityPage/vibes';
import { staggerItem } from '../../utils/animations';

/** Same four-up grid for the skeleton and the results, so nothing shifts on load. */
const crewGridSx = {
  display: 'grid',
  gridTemplateColumns: {
    xs: '1fr',
    sm: 'repeat(2, 1fr)',
    md: 'repeat(3, 1fr)',
    lg: 'repeat(4, 1fr)',
  },
  gap: 2.5,
} as const;

const VIBE_FILTERS = ['', 'adventure', 'culture', 'urban', 'scenic', 'spiritual'];

/**
 * The traveller directory: its own search, its own filters, its own results.
 *
 * Lifted out of the Crew page so Browse can hold it as a segment without either
 * surface reimplementing a people search. It brings its own controls because a
 * person is looked up by name and vibe, which is not what Browse's destination
 * search and category chips do - sharing those would have meant one control
 * meaning two different things depending on the tab.
 */
const CrewDirectory: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const requireAuth = useRequireAuth();
  const { token } = useAuthToken();

  /*
   * The query lives in the URL, so a search can be linked to and returned to,
   * which is the reason this became a route in the first place. Seeded once from
   * ?q= rather than read every render: the box is the owner of what is typed and
   * a controlled loop through the URL would fight the debounce below.
   */
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = React.useRef(searchParams.get('q') ?? '').current;
  const [query, setQuery] = React.useState(initialQuery);
  const [queryApplied, setQueryApplied] = React.useState(initialQuery);
  const [vibe, setVibe] = React.useState('');
  const [travelers, setTravelers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [connectingId, setConnectingId] = React.useState<number | null>(null);
  const [connectedIds, setConnectedIds] = React.useState<Set<number>>(new Set());

  // Typing fires a request per keystroke without this, and the crew query fans
  // out across every public account server-side.
  React.useEffect(() => {
    const t = setTimeout(() => setQueryApplied(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Mirror the applied query back into the URL, replacing rather than pushing so
  // typing does not fill the back button with one entry per keystroke.
  React.useEffect(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (queryApplied) next.set('q', queryApplied);
      else next.delete('q');
      return next;
    }, { replace: true });
  }, [queryApplied, setSearchParams]);

  React.useEffect(() => {
    let active = true;
    setLoading(true);

    /*
     * The directory has two modes and one control.
     *
     * Idle, it shows people who have published something: a wall of members with
     * nothing on their card is a worse answer than a short list of travellers you
     * can actually learn something from. The moment someone types, `publishedOnly`
     * drops and the search reaches every member, which is the only way "find
     * Rahul" works for someone who just signed up.
     */
    apiServices
      .getTravelersCrew(undefined, vibe || undefined, undefined, !queryApplied, queryApplied || undefined)
      .then((resp) => {
        if (active) setTravelers(resp.data || []);
      })
      .catch(() => {
        if (active) setTravelers([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [queryApplied, vibe]);

  const handleFollow = async (t: any) => {
    if (!requireAuth({ reason: 'Follow a traveller to see their trips and stories as they publish.' }) || !token) return;
    if (connectingId === t.userId || connectedIds.has(t.userId)) return;

    setConnectingId(t.userId);
    try {
      await apiServices.followUser(token, t.userId);
      setConnectedIds((prev) => new Set([...prev, t.userId]));
      window.dispatchEvent(
        new CustomEvent('app:success', { detail: { message: `Now following ${t.name || 'this traveler'}` } }),
      );
    } catch {
      window.dispatchEvent(
        new CustomEvent('app:error', { detail: { message: 'Could not connect. Please try again.' } }),
      );
    } finally {
      setConnectingId(null);
    }
  };

  return (
    <>
      <motion.div variants={staggerItem}>
        {/* Search leads, filters follow. Putting a narrow box beside the vibe
            chips read as one more filter, so nothing suggested you could look
            a person up by name. */}
        <Box sx={{ maxWidth: 620 }}>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search travellers by name or destination..."
            sx={{ width: '100%', height: 50 }}
          />
        </Box>

        <ChipRail sx={{ mt: 2 }}>
          {VIBE_FILTERS.map((v) => (
            <FilterChip
              key={v || 'any'}
              label={v ? VIBES[v]?.label || v : 'Any vibe'}
              active={vibe === v}
              onClick={() => setVibe(v)}
            />
          ))}
        </ChipRail>
      </motion.div>

      {/* Says what you are looking at, so a short list reads as an answer
          rather than as something failing to load. */}
      {!loading && travelers.length > 0 && (
        <Typography sx={{ mt: 3, fontSize: 13, color: 'text.secondary' }}>
          {queryApplied
            ? `${travelers.length} ${travelers.length === 1 ? 'traveller' : 'travellers'} matching "${queryApplied}"`
            : 'Travellers who have published trips · search to find anyone'}
        </Typography>
      )}

      {loading ? (
        <Box sx={{ ...crewGridSx, mt: 4 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Box
              key={i}
              sx={{
                borderRadius: '18px',
                p: 2.25,
                border: `1px solid ${theme.custom.surface.border}`,
                bgcolor: 'background.paper',
              }}
            >
              <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                <Skeleton variant="circular" width={48} height={48} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="60%" height={18} />
                  <Skeleton variant="text" width="40%" height={14} />
                </Box>
              </Box>
              <Skeleton variant="rounded" width="100%" height={32} sx={{ borderRadius: 999 }} />
            </Box>
          ))}
        </Box>
      ) : travelers.length === 0 ? (
        /* Two different dead ends, and telling them apart is the difference
           between "you typo'd" and "nobody is here yet". */
        queryApplied ? (
          <EmptyState
            icon={IconUsers}
            title={`No traveller matches "${queryApplied}"`}
            description="Try part of a name, or a country someone has published a trip to."
            actionLabel="Clear search"
            onAction={() => setQuery('')}
          />
        ) : (
          <EmptyState
            icon={IconUsers}
            title="No published travellers yet"
            description={
              vibe
                ? 'Nobody has published a trip with this vibe. Clear the filter, or search for someone by name.'
                : 'Once people publish their trips they will show up here. You can still search for any member by name.'
            }
            {...(vibe ? { actionLabel: 'Clear filter', onAction: () => setVibe('') } : {})}
          />
        )
      ) : (
        <Box sx={{ ...crewGridSx, mt: 4 }}>
          {travelers.map((t: any) => {
            const isConnected = connectedIds.has(t.userId);
            return (
              <Box
                key={t.userId}
                sx={{
                  borderRadius: '18px',
                  p: 2.25,
                  border: `1px solid ${theme.custom.surface.border}`,
                  bgcolor: 'background.paper',
                  boxShadow: theme.custom.shadows.card,
                  /* Equal height, button pinned to the bottom. Results mix
                     publishers (who have a destinations line) with members who
                     do not, and a grid whose buttons sit at different heights
                     is the main thing that reads as unfinished. */
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: `box-shadow ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}, transform ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}`,
                  '&:hover': { boxShadow: theme.custom.shadows.cardHover, transform: 'translateY(-2px)' },
                }}
              >
                <Box
                  onClick={() => navigate(`/traveler/${t.userId}`)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/traveler/${t.userId}`);
                    }
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    mb: 1.25,
                    cursor: 'pointer',
                    '&:hover .crew-name': { color: 'primary.main' },
                    '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
                  }}
                >
                  <Avatar
                    src={t.avatar || undefined}
                    sx={{ width: 48, height: 48, fontSize: 17, bgcolor: 'primary.main' }}
                  >
                    {!t.avatar && (t.name || 'E').charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      noWrap
                      className="crew-name"
                      sx={{ fontSize: 14.5, fontWeight: 600, color: 'text.primary', transition: 'color 120ms' }}
                    >
                      {t.name || 'Explorer'}
                    </Typography>
                    {/* The roster includes members who have not published yet,
                        so "0 trips" is a normal state rather than an error. Say
                        something human instead of a zero. */}
                    <Typography noWrap sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {t.tripCount > 0 ? `${t.tripCount} trip${t.tripCount !== 1 ? 's' : ''}` : 'New here'}
                      {t.vibe ? ` · ${VIBES[t.vibe?.toLowerCase?.()]?.label || t.vibe}` : ''}
                    </Typography>
                  </Box>
                </Box>

                {Array.isArray(t.destinations) && t.destinations.length > 0 && (
                  <Typography
                    noWrap
                    sx={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      letterSpacing: '-0.005em',
                      color: 'text.secondary',
                      opacity: 0.72,
                      mb: 1.5,
                    }}
                  >
                    {t.destinations.slice(0, 3).join(' · ')}
                    {t.destinations.length > 3 ? ` · +${t.destinations.length - 3}` : ''}
                  </Typography>
                )}

                <Button
                  onClick={() => void handleFollow(t)}
                  size="small"
                  fullWidth
                  variant="outlined"
                  disabled={connectingId === t.userId}
                  startIcon={isConnected ? <IconCheck size={15} /> : <IconUserPlus size={15} />}
                  sx={{
                    mt: 'auto', // pins to the card's bottom edge
                    ...(isConnected
                      ? {
                          borderColor: 'success.main',
                          color: 'success.main',
                          '&:hover': {
                            borderColor: 'success.main',
                            color: 'success.main',
                            bgcolor: alpha(theme.palette.success.main, 0.06),
                          },
                        }
                      : {}),
                  }}
                >
                  {connectingId === t.userId ? 'Connecting...' : isConnected ? 'Following' : 'Connect'}
                </Button>
              </Box>
            );
          })}
        </Box>
      )}
    </>
  );
};

export default CrewDirectory;
