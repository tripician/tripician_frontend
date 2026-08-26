import React from 'react';
import { Avatar, Box, Button, IconButton, Skeleton, Tooltip, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useRequireAuth } from '../../auth/AuthGate';
import { useSelector } from 'react-redux';
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandX,
  IconCalendar,
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
import { safeExternalUrl } from '../../utils/sanitizeHtml';
import Seo from '../../components/Seo';
import CommunityTripCard from '../CommunityPage/CommunityTripCard';
import { ProfilePassport } from './ProfilePassport';
import ProfileIntro from './ProfileIntro';
import IdentityVerifiedMark from '../../components/ui/IdentityVerifiedMark';
import SectionHeader from '../../components/ui/SectionHeader';
import { FEATURE_FLAGS } from '../../config/featureFlags';
import StoryDiary from '../../afterstory/cards/StoryDiary';
import ProfilePosts from '../../posts/ProfilePosts';
import { afterStoryService } from '../../afterstory/afterStoryService';
import type { AfterStorySummaryDto } from '../../afterstory/types';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { CardGridSkeleton } from '../../components/ui/Skeletons';
import { fadeInUp } from '../../utils/animations';

/** Community's measure, shared with /profile so the three do not disagree. */
const CONTENT_MAX = 1280;

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
  bio?: { highlights?: Array<{ key?: string; label?: string; value?: string; icon?: string }> } | null;
  joinedAt?: string | null;
  identityVerifiedAt?: string | null;
}

/**
 * Public traveler profile - Instagram-style activity view for any community
 * member: identity, follow stats, and their published trips.
 */
const TravelerProfile: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const requireAuth = useRequireAuth();
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
  const [stories, setStories] = React.useState<AfterStorySummaryDto[]>([]);

  // listByAuthor swallows its own failures and returns an empty array, so a
  // stories outage cannot take the profile down with it.
  React.useEffect(() => {
    if (!FEATURE_FLAGS.afterStory || !Number.isFinite(userId)) return;
    let active = true;
    void afterStoryService.listByAuthor(userId, 12).then(items => { if (active) setStories(items); });
    return () => { active = false; };
  }, [userId]);

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
    if (!requireAuth({ reason: 'Follow a traveller to see their trips and stories as they publish.' }) || !token) return;
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
  ]
    .filter(s => s.url && !String(s.url).toUpperCase().includes('NULL'))
    .map(s => ({ ...s, url: safeExternalUrl(s.url) }))
    .filter((s): s is { url: string; Icon: typeof IconLink; label: string } => !!s.url) : [];

  const locationLine = user ? [user.location, user.country].filter(Boolean).join(', ') : '';

  // How long someone has been here is part of deciding whether to travel with
  // them, and it is the one fact on this page they cannot edit.
  const joinedDate = user?.joinedAt ? new Date(user.joinedAt) : null;
  const joinedLine = joinedDate && !Number.isNaN(joinedDate.getTime())
    ? `Travelling with Tripician since ${joinedDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`
    : '';
  const showCover = !!user?.cover && !coverFailed;

  const statItems = [
    { value: trips.length, label: trips.length === 1 ? 'trip' : 'trips' },
    { value: stats.followers, label: stats.followers === 1 ? 'follower' : 'followers' },
    { value: stats.following, label: 'following' },
  ];

  /**
   * The passport, derived from the published trips already on the page.
   *
   * /profile reads /api/trips/vibe-passport, which is authenticated-user only:
   * there is no endpoint for someone else's passport, and adding one would mean
   * deciding in public what a stranger's night count and vibe mix are. Published
   * trips are already public, so their countries are the honest subset, and the
   * band keeps the row that makes it recognisable across both pages.
   */
  // Not memoised: this sits below an early return, where a hook would change
  // call order between renders. It is a single pass over an already-loaded page
  // of trips, so there is nothing to save.
  const publicCountries = (() => {
    const seen = new Set<string>();
    for (const t of trips) {
      const list: unknown = (t as any)?.countries;
      if (!Array.isArray(list)) continue;
      for (const c of list) if (typeof c === 'string' && c.trim()) seen.add(c.trim());
    }
    return [...seen];
  })();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Seo
        title={user ? `${user.name} - Traveler` : 'Traveler profile'}
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

            {/* Avatar. ONLY the avatar overlaps the cover, matching /profile:
                once the name became a real h1 the taller text block landed
                inside the photograph, where dark serif on an uncontrolled image
                is close to unreadable. */}
            <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', px: 0 }}>
              {userLoading ? (
                <Skeleton variant="circular" width={104} height={104} />
              ) : (
                <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
                  <Avatar
                    src={user?.avatar || undefined}
                    sx={{
                      width: { xs: 88, sm: 104 }, height: { xs: 88, sm: 104 },
                      fontSize: '2.2rem', bgcolor: 'primary.main',
                      border: `4px solid ${theme.palette.background.default}`,
                      boxShadow: theme.custom.shadows.card,
                      flexShrink: 0,
                    }}
                  >
                    {(user?.name || 'T').charAt(0).toUpperCase()}
                  </Avatar>
                  <IdentityVerifiedMark verified={!!user?.identityVerifiedAt} size={24} />
                </Box>
              )}
            </Box>

            {/* Identity, entirely below the cover. */}
            <Box sx={{
              display: 'flex', gap: { xs: 2, sm: 3 },
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'flex-start' },
              justifyContent: 'space-between',
              px: 0,
              mt: 1.5,
            }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {userLoading ? (
                  <>
                    <Skeleton variant="text" width={220} height={38} />
                    <Skeleton variant="text" width={140} height={20} />
                  </>
                ) : (
                  <>
                    {/* Same masthead as /profile: variant h1, display face. This
                        was a hand-tuned fontSize a step smaller, so the same
                        person's name changed size depending on who was looking. */}
                    <Typography component="h1" variant="h1" noWrap sx={{
                      color: 'text.primary',
                    }}>
                      {user?.name || 'Explorer'}
                    </Typography>
                    {locationLine && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, color: 'text.secondary' }}>
                        <IconMapPin size={14} stroke={1.9} />
                        <Typography variant="body2" noWrap>{locationLine}</Typography>
                      </Box>
                    )}
                    {joinedLine && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, color: 'text.secondary' }}>
                        <IconCalendar size={14} stroke={1.9} />
                        <Typography variant="body2" noWrap>{joinedLine}</Typography>
                      </Box>
                    )}
                    {/* Stats - Instagram-style inline row */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mt: 1.25 }}>
                      {statItems.map(s => (
                        <Typography key={s.label} variant="body2" sx={{ color: 'text.secondary' }}>
                          <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{s.value}</Box> {s.label}
                        </Typography>
                      ))}
                    </Box>
                  </>
                )}
              </Box>

              {/* Actions */}
              {!userLoading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, pt: { sm: 1 } }}>
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

            {!userLoading && user && <ProfileIntro profile={user} />}

            {/* Travel passport, the same band /profile carries. Hidden outright
                when there is nothing published: its empty state invites YOU to
                plan a trip, which is the wrong thing to say on someone else's
                profile. */}
            {!tripsLoading && (trips.length > 0 || publicCountries.length > 0) && (
              <Box sx={{ mt: { xs: 3, md: 4 } }}>
                <ProfilePassport
                  passport={{
                    trips: trips.length,
                    // Unknown, not zero: there is no public passport endpoint, so
                    // the band drops the tile rather than claiming a night count.
                    nights: 0,
                    countries: publicCountries,
                    vibes: [],
                    favoriteVibe: null,
                  }}
                  hideWhenEmpty
                />
              </Box>
            )}

            {/* Their stories, above the trips.
                They used to sit underneath, on the reasoning that a plan is what
                this profile was about. That is no longer true: someone opening a
                stranger's profile is deciding whether to travel with them, and a
                grid of itineraries answers where they went, not who they are. */}
            {FEATURE_FLAGS.afterStory && (
              <StoryDiary
                stories={stories}
                title={user ? `${user.name.split(' ')[0]}'s diary` : 'Diary'}
                subtitle="What the trips were actually like, in their words."
              />
            )}

            {/* What they have been saying. Renders nothing when they have not
                posted, so a quiet profile does not carry an empty heading. */}
            {userId && (
              <ProfilePosts
                authorUserId={Number(userId)}
                title={user ? `${user.name.split(' ')[0]} lately` : 'Lately'}
              />
            )}

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
