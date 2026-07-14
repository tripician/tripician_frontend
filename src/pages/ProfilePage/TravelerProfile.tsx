import React from 'react';
import { Avatar, Box, Button, IconButton, Skeleton, Tooltip, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandX,
  IconCheck,
  IconCompass,
  IconLink,
  IconMapPin,
  IconUserPlus,
} from '@tabler/icons-react';
import type { RootState } from '../../store';
import { apiServices } from '../../services/APIs/apiServices';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { tripPath } from '../../utils/tripSlug';
import Seo from '../../components/Seo';
import CommunityTripCard from '../CommunityPage/CommunityTripCard';
import SectionHeader from '../../components/ui/SectionHeader';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { CardGridSkeleton } from '../../components/ui/Skeletons';
import { fadeInUp } from '../../utils/animations';

const CONTENT_MAX = 1140;

interface PublicUser {
  id: number;
  name: string;
  avatar: string | null;
  cover: string | null;
  country: string | null;
  location: string | null;
  website: string | null;
  instagram: string | null;
  twitter: string | null;
  facebook: string | null;
}

/**
 * Public traveler profile ,Instagram-style activity view for any community
 * member: identity, follow stats, and their published trips.
 */
const TravelerProfile: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { userId: userIdParam } = useParams<{ userId: string }>();
  const userId = Number(userIdParam);
  const { token } = useAuthToken();
  const myProfile = useSelector((state: RootState) => state.user.profile);

  const [user, setUser] = React.useState<PublicUser | null>(null);
  const [userLoading, setUserLoading] = React.useState(true);
  const [userError, setUserError] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);

  const [stats, setStats] = React.useState<{ followers: number; following: number }>({ followers: 0, following: 0 });
  const [trips, setTrips] = React.useState<any[]>([]);
  const [tripsLoading, setTripsLoading] = React.useState(true);

  const [isFollowing, setIsFollowing] = React.useState(false);
  const [followBusy, setFollowBusy] = React.useState(false);
  const [coverFailed, setCoverFailed] = React.useState(false);

  // Public user identity + follow stats
  React.useEffect(() => {
    if (!Number.isFinite(userId)) return;
    let active = true;
    setUserLoading(true);
    setUserError(false);
    apiServices.getUserById(userId)
      .then(resp => { if (active) setUser(resp.data); })
      .catch(() => { if (active) setUserError(true); })
      .finally(() => { if (active) setUserLoading(false); });
    apiServices.getFollowStats(userId)
      .then(resp => { if (active) setStats(resp.data); })
      .catch(() => { /* keep zeros */ });
    return () => { active = false; };
  }, [userId, reloadKey]);

  // Their published trips (activity grid)
  React.useEffect(() => {
    if (!Number.isFinite(userId)) return;
    let active = true;
    setTripsLoading(true);
    apiServices.getPublishedTrips(token ?? undefined)
      .then(resp => {
        if (!active) return;
        const data = Array.isArray(resp?.data) ? resp.data : [];
        setTrips(data.filter((t: any) => String(t.ownerUserId ?? t.owner?.id ?? '') === String(userId)));
      })
      .catch(() => { if (active) setTrips([]); })
      .finally(() => { if (active) setTripsLoading(false); });
    return () => { active = false; };
  }, [userId, token, reloadKey]);

  // Whether the signed-in viewer already follows this traveler
  React.useEffect(() => {
    if (!token || !Number.isFinite(userId)) return;
    let active = true;
    apiServices.isFollowing(token, userId)
      .then(resp => { if (active) setIsFollowing(!!resp.data?.isFollowing); })
      .catch(() => { /* default to not following */ });
    return () => { active = false; };
  }, [token, userId]);

  // Viewing yourself → your own profile page has the full experience
  if (myProfile?.id && String(myProfile.id) === String(userId)) {
    return <Navigate to="/profile" replace />;
  }

  if (!Number.isFinite(userId)) {
    return <Navigate to="/error/404" replace />;
  }

  const handleFollowToggle = async () => {
    if (!token) { navigate('/signin'); return; }
    if (followBusy) return;
    setFollowBusy(true);
    const next = !isFollowing;
    setIsFollowing(next);
    setStats(s => ({ ...s, followers: Math.max(0, s.followers + (next ? 1 : -1)) }));
    try {
      if (next) await apiServices.followUser(token, userId);
      else await apiServices.unfollowUser(token, userId);
    } catch {
      // revert on failure
      setIsFollowing(!next);
      setStats(s => ({ ...s, followers: Math.max(0, s.followers + (next ? -1 : 1)) }));
      window.dispatchEvent(new CustomEvent('app:error', { detail: { message: 'Could not update follow. Please try again.' } }));
    } finally {
      setFollowBusy(false);
    }
  };

  const handleTripClick = (trip: any) => {
    const tripId = trip.id || trip.Id;
    if (tripId) navigate(tripPath({ id: tripId, name: trip.name }), { state: { trip } });
  };

  const socials = user ? [
    { url: user.instagram, Icon: IconBrandInstagram, label: 'Instagram' },
    { url: user.twitter, Icon: IconBrandX, label: 'X' },
    { url: user.facebook, Icon: IconBrandFacebook, label: 'Facebook' },
    { url: user.website, Icon: IconLink, label: 'Website' },
  ].filter(s => s.url) : [];

  const locationLine = user ? [user.location, user.country].filter(Boolean).join(', ') : '';
  const showCover = !!user?.cover && !coverFailed;

  const statItems = [
    { value: trips.length, label: trips.length === 1 ? 'trip' : 'trips' },
    { value: stats.followers, label: stats.followers === 1 ? 'follower' : 'followers' },
    { value: stats.following, label: 'following' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Seo
        title={user ? `${user.name} ,Traveler` : 'Traveler profile'}
        description={user ? `Published trips and travel activity from ${user.name} on Tripician.` : 'Traveler profile on Tripician.'}
        path={`/traveler/${userId}`}
        noindex
      />

      <Box sx={{ maxWidth: CONTENT_MAX, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 3, md: 4 }, pb: 10 }}>
        {userError ? (
          <ErrorState
            title="Traveler not found"
            description="This profile may have been removed, or the link is broken."
            onRetry={() => setReloadKey(k => k + 1)}
          />
        ) : (
          <motion.div variants={fadeInUp} initial="hidden" animate="visible">
            {/* Cover (only when the traveler set one) */}
            {showCover && (
              <Box sx={{
                height: { xs: 140, sm: 190, md: 220 }, borderRadius: '20px', overflow: 'hidden',
                border: `1px solid ${theme.custom.surface.border}`, mb: { xs: -6, sm: -7 },
              }}>
                <Box
                  component="img" src={user?.cover ?? undefined} alt=""
                  onError={() => setCoverFailed(true)}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </Box>
            )}

            {/* Identity row */}
            <Box sx={{
              display: 'flex', gap: { xs: 2, sm: 3 },
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              position: 'relative',
              px: showCover ? { xs: 2, sm: 4 } : 0,
            }}>
              {userLoading ? (
                <Skeleton variant="circular" width={104} height={104} />
              ) : (
                <Avatar
                  src={user?.avatar || undefined}
                  sx={{
                    width: { xs: 88, sm: 104 }, height: { xs: 88, sm: 104 },
                    fontSize: '2.2rem', bgcolor: 'primary.main',
                    border: `4px solid ${theme.palette.background.default}`,
                    boxShadow: theme.custom.shadows.card,
                  }}
                >
                  {(user?.name || 'T').charAt(0).toUpperCase()}
                </Avatar>
              )}

              <Box sx={{ flex: 1, minWidth: 0, pt: showCover ? { sm: 5 } : 0 }}>
                {userLoading ? (
                  <>
                    <Skeleton variant="text" width={220} height={38} />
                    <Skeleton variant="text" width={140} height={20} />
                  </>
                ) : (
                  <>
                    <Typography component="h1" noWrap sx={{
                      fontFamily: theme.custom.fontDisplay, fontWeight: 700,
                      fontSize: { xs: '1.6rem', md: '1.9rem' },
                      letterSpacing: '-0.02em', lineHeight: 1.15, color: 'text.primary',
                    }}>
                      {user?.name || 'Explorer'}
                    </Typography>
                    {locationLine && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, color: 'text.secondary' }}>
                        <IconMapPin size={14} stroke={1.9} />
                        <Typography noWrap sx={{ fontSize: 13.5 }}>{locationLine}</Typography>
                      </Box>
                    )}
                    {/* Stats ,Instagram-style inline row */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mt: 1.25 }}>
                      {statItems.map(s => (
                        <Typography key={s.label} sx={{ fontSize: 14, color: 'text.secondary' }}>
                          <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{s.value}</Box> {s.label}
                        </Typography>
                      ))}
                    </Box>
                  </>
                )}
              </Box>

              {/* Actions */}
              {!userLoading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: showCover ? { sm: 5 } : 0 }}>
                  {socials.map(({ url, Icon, label }) => (
                    <Tooltip key={label} title={label}>
                      <IconButton
                        component="a" href={url!} target="_blank" rel="noopener noreferrer" size="small"
                        sx={{ color: 'text.secondary', border: `1px solid ${theme.custom.surface.border}`, '&:hover': { color: 'text.primary' } }}
                      >
                        <Icon size={16} stroke={1.9} />
                      </IconButton>
                    </Tooltip>
                  ))}
                  <Button
                    onClick={handleFollowToggle}
                    disabled={followBusy}
                    variant={isFollowing ? 'outlined' : 'contained'}
                    startIcon={isFollowing ? <IconCheck size={15} /> : <IconUserPlus size={15} />}
                    sx={isFollowing
                      ? { borderColor: 'success.main', color: 'success.main', '&:hover': { borderColor: 'success.main', color: 'success.main', bgcolor: alpha(theme.palette.success.main, 0.06) } }
                      : undefined}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </Button>
                </Box>
              )}
            </Box>

            {/* Published trips */}
            <Box sx={{ mt: { xs: 5, md: 6 } }}>
              <SectionHeader
                title="Published trips"
                subtitle={user ? `Itineraries ${user.name} has shared with the community` : undefined}
              />
              {tripsLoading ? (
                <CardGridSkeleton count={6} minWidth={280} />
              ) : trips.length === 0 ? (
                <EmptyState
                  icon={IconCompass}
                  title="No published trips yet"
                  description="When this traveler publishes an itinerary, it will show up here."
                  actionLabel="Explore the community"
                  onAction={() => navigate('/community')}
                />
              ) : (
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
                  gap: 3,
                }}>
                  {trips.map((trip, i) => (
                    <CommunityTripCard key={trip.id || i} trip={trip} onClick={() => handleTripClick(trip)} />
                  ))}
                </Box>
              )}
            </Box>
          </motion.div>
        )}
      </Box>
    </Box>
  );
};

export default TravelerProfile;
