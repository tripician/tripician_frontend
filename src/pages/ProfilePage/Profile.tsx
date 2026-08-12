import React, { useEffect, useState, useMemo } from 'react';
import {
  Avatar, Box, Button, Chip, CircularProgress, IconButton,
  Tooltip, Typography, useTheme,
} from '@mui/material';
import { motion } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandX,
  IconCake,
  IconGenderBigender,
  IconHeart,
  IconLink,
  IconMail,
  IconMap,
  IconMapPin,
  IconSparkles,
  IconPhone,
  IconArrowRight,
  IconRoute,
  IconUsers,
  IconWorld,
} from '@tabler/icons-react';
import type { RootState, AppDispatch } from '../../store';
import { fetchUserProfile } from '../../store/userSlice';
import { apiServices } from '../../services/APIs/apiServices';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { fetchUnsplashImage } from '../../services/unsplashService';
import ImageBadge from '../../components/ui/ImageBadge';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { CardGridSkeleton } from '../../components/ui/Skeletons';
import { staggerContainer, staggerItem } from '../../utils/animations';
import { safeExternalUrl } from '../../utils/sanitizeHtml';
import { tripPath } from '../../utils/tripSlug';

const CONTENT_MAX = 1200;

// Default banner fetched once from Unsplash - personalized by the user's location
const _defaultBannerCache: Record<string, string> = {};

async function loadDefaultBanner(place: string): Promise<string | null> {
  const key = place.trim().toLowerCase();
  if (_defaultBannerCache[key]) return _defaultBannerCache[key];

  const queries = [
    `${place} landscape travel`,
    `${place} aerial scenery`,
    `${place} nature travel`,
  ];

  for (const q of queries) {
    const url = await fetchUnsplashImage(q);
    if (url) { _defaultBannerCache[key] = url; return url; }
  }
  return null;
}

// ── trip card ──────────────────────────────────────────────────────────────

/**
 * A trip in the profile grid.
 *
 * Borderless on purpose: the photograph is the card. Wrapping every image in a
 * bordered, shadowed box adds two competing rectangles around content that is
 * already rectangular, and at three-up it reads as a table of boxes rather than
 * a wall of places. The lift and the shadow arrive on hover, where they mean
 * something.
 *
 * `showOwner` is set for the Saved and Liked tabs, which list other people's
 * trips - without it those grids give no clue whose journey you are looking at.
 */
const ProfileTripCard: React.FC<{ trip: any; onClick: () => void; showOwner?: boolean }> = ({ trip, onClick, showOwner }) => {
  const theme = useTheme();
  const cover = trip.bannerPhotoUrl || trip.BannerPhotoUrl || trip.photoUrl || trip.PhotoUrl || null;
  const [photo, setPhoto] = useState<string | null>(cover);

  useEffect(() => {
    if (cover) { setPhoto(cover); return; }
    const q = (Array.isArray(trip.countries) && trip.countries[0]
      ? trip.countries[0] : trip.name || 'travel').split(',')[0];
    let cancelled = false;
    fetchUnsplashImage(q).then(url => { if (!cancelled && url) setPhoto(url); });
    return () => { cancelled = true; };
  }, [cover, trip.countries, trip.name]);

  const nights = trip.totalNights ?? trip.targetNights ?? null;
  const countries: string[] = Array.isArray(trip.countries) ? trip.countries : [];
  const isPublished = trip.published === true || (trip.status || '').toUpperCase() === 'PUBLISHED';
  const owner = trip.owner || trip.Owner || null;
  const ownerName: string = owner?.name || owner?.Name || '';
  // `TripUserDto.ProfilePictureUrl` carries [JsonPropertyName("profilePicture")],
  // so the wire field is `profilePicture` - reading the C# property name gets you
  // undefined and a silent fallback to initials. The other spellings cover the
  // endpoints that shape the owner object by hand.
  const ownerAvatar: string | undefined =
    owner?.profilePicture || owner?.profilePictureUrl || owner?.ProfilePictureUrl
    || owner?.avatar || owner?.profilePic || undefined;

  const metaLine = [
    ...countries.slice(0, 2),
    countries.length > 2 ? `+${countries.length - 2}` : null,
    nights !== null ? `${nights} ${nights === 1 ? 'night' : 'nights'}` : null,
  ].filter(Boolean).join(' · ');

  // Dates are what turn "a place" into "a trip", so they get their own line
  // rather than being crammed into the meta run.
  const start = trip.startDate || trip.StartDate;
  const end = trip.endDate || trip.EndDate;
  const dateLine = (() => {
    if (!start) return null;
    const s = new Date(start);
    const e = end ? new Date(end) : null;
    if (Number.isNaN(s.getTime())) return null;
    const fmt = (d: Date, withYear: boolean) =>
      d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) });
    if (!e || Number.isNaN(e.getTime())) return fmt(s, true);
    return `${fmt(s, s.getFullYear() !== e.getFullYear())} - ${fmt(e, true)}`;
  })();

  return (
    <motion.div whileHover={{ y: -3 }} onClick={onClick} style={{ cursor: 'pointer', height: '100%' }}>
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Box
          className="trip-cover"
          sx={{
            position: 'relative',
            // 3:2 rather than 4:3 - the photographic ratio, and it stops a row of
            // cards from turning into a row of squares.
            aspectRatio: '3 / 2',
            overflow: 'hidden',
            borderRadius: '14px',
            bgcolor: theme.custom.surface.active,
            transition: `box-shadow ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}`,
            '.MuiBox-root:hover > &, &:hover': { boxShadow: theme.custom.shadows.cardHover },
          }}
        >
          {photo ? (
            <Box
              component="img"
              src={photo}
              alt=""
              loading="lazy"
              // A stored banner URL can rot - an expired Unsplash link, a deleted
              // upload. Without this the card shows the browser's broken-image
              // glyph, which looks far worse than having no photo at all.
              onError={() => setPhoto(null)}
              sx={{
                width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                transition: `transform ${theme.custom.motion.duration.slow} ${theme.custom.motion.easing.standard}`,
              }}
            />
          ) : (
            <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconMapPin size={26} stroke={1.5} color={theme.palette.text.disabled} />
            </Box>
          )}

          {/* A soft floor under the badges so white pills stay legible on a pale
              photo without tinting the whole image. */}
          {(isPublished || trip.tripStatus === 1) && (
            <Box sx={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(180deg, rgba(10,10,14,0.28) 0%, rgba(10,10,14,0) 38%)',
            }} />
          )}
          {isPublished && <ImageBadge sx={{ position: 'absolute', top: 10, left: 10 }}>Shared</ImageBadge>}
          {trip.tripStatus === 1 && (
            <ImageBadge sx={{ position: 'absolute', top: 10, right: 10 }}>
              <Box sx={{
                width: 6, height: 6, borderRadius: '50%', bgcolor: 'error.main',
                animation: 'livePulse 1.6s ease-in-out infinite',
                '@keyframes livePulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.35 } },
              }} />
              Live
            </ImageBadge>
          )}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.35, flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', color: 'text.primary', lineHeight: 1.35 }}>
            {trip.name || 'Untitled Journey'}
          </Typography>

          {/* Bold and held back - same subhead treatment as CommunityTripCard. */}
          {metaLine && (
            <Typography noWrap sx={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.005em', color: 'text.secondary', opacity: 0.72, lineHeight: 1.4 }}>
              {metaLine}
            </Typography>
          )}

          {dateLine && (
            <Typography noWrap sx={{ fontSize: 12.5, color: 'text.disabled', lineHeight: 1.4 }}>
              {dateLine}
            </Typography>
          )}

          {showOwner && ownerName && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.4, minWidth: 0 }}>
              <Avatar
                src={ownerAvatar}
                sx={{ width: 20, height: 20, fontSize: 10 }}
              >
                {ownerName.charAt(0).toUpperCase()}
              </Avatar>
              <Typography noWrap sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                by {ownerName}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </motion.div>
  );
};

// ── sidebar card ───────────────────────────────────────────────────────────

const SideCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const theme = useTheme();
  return (
    <Box sx={{
      borderRadius: '16px', mb: 2.5,
      border: `1px solid ${theme.custom.surface.border}`,
      bgcolor: 'background.paper',
      boxShadow: theme.custom.shadows.card,
    }}>
      <Typography variant="subtitle2" sx={{ px: 2.5, pt: 2, pb: 1.25, color: 'text.primary' }}>
        {title}
      </Typography>
      <Box sx={{ px: 2.5, pb: 2.25 }}>{children}</Box>
    </Box>
  );
};

// Bio highlights store feather-style icon NAMES ("heart", "map-pin") - they must
// be mapped to real icon components or the raw name renders as text.
const HIGHLIGHT_ICONS: Record<string, React.ElementType> = {
  heart: IconHeart,
  map: IconMap,
  'map-pin': IconMapPin,
};

const HighlightIcon: React.FC<{ icon?: string }> = ({ icon }) => {
  const name = (icon || '').trim();
  const Mapped = HIGHLIGHT_ICONS[name.toLowerCase()];
  if (Mapped) return <Mapped size={17} stroke={1.8} />;
  // Emoji (or any non-ASCII glyph) stored directly is fine to render as text.
  if (name && /[^\x20-\x7E]/.test(name)) return <>{name}</>;
  return <IconSparkles size={17} stroke={1.8} />;
};

/**
 * Placeholder strings the backend stores when a field was never filled in.
 * Rendering "Country: Not Available" is worse than rendering nothing - it draws
 * the eye to an absence and makes the profile look broken rather than sparse.
 */
const PLACEHOLDERS = new Set(['not available', 'n/a', 'na', 'none', 'null', 'undefined', '-']);
const presentable = (value?: string | null): string | undefined => {
  const v = value?.trim();
  if (!v || PLACEHOLDERS.has(v.toLowerCase())) return undefined;
  return v;
};

const DetailRow: React.FC<{ Icon: React.ElementType; label: string; value?: string | null }> = ({ Icon, label, value }) => {
  const theme = useTheme();
  if (!presentable(value)) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, py: 0.9 }}>
      <Box sx={{ pt: '2px', flexShrink: 0, color: theme.palette.text.disabled, display: 'flex' }}>
        <Icon size={16} stroke={1.8} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.disabled', lineHeight: 1.3 }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: 13.5, fontWeight: 500, color: 'text.primary', wordBreak: 'break-word', lineHeight: 1.4 }}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
};

// ── main ───────────────────────────────────────────────────────────────────

const Profile: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { token } = useAuthToken();
  const { profile, loading, error } = useSelector((state: RootState) => state.user);

  const [myTrips, setMyTrips] = useState<any[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [followStats, setFollowStats] = useState<{ followers: number; following: number }>({ followers: 0, following: 0 });
  const [vibePassport, setVibePassport] = useState<{
    vibes: Array<{ name: string; count: number; percentage: number }>;
    topCountries: string[];
    totalNights: number;
    totalTrips: number;
    favoriteVibe: string | null;
  } | null>(null);
  const [defaultBanner, setDefaultBanner] = useState<string | null>(null);
  const [coverFailed, setCoverFailed] = useState(false);

  useEffect(() => { dispatch(fetchUserProfile()); }, [dispatch]);

  // Cover fallback: Unsplash scenery for the user's location.
  // No location or country on file → no fetch; the cover stays a clean blank band.
  useEffect(() => {
    let cancelled = false;
    const place = profile?.location?.trim() || profile?.country?.trim();
    if (!place) { setDefaultBanner(null); return; }
    loadDefaultBanner(place).then(url => { if (!cancelled) setDefaultBanner(url); });
    return () => { cancelled = true; };
  }, [profile?.location, profile?.country]);

  // Fetch vibe passport
  useEffect(() => {
    if (!token) return;
    let active = true;
    (async () => {
      try {
        const resp = await apiServices.getVibePassport(token);
        if (!active) return;
        setVibePassport(resp.data);
      } catch { /* silent - optional enrichment */ }
    })();
    return () => { active = false; };
  }, [token]);

  // Fetch follow stats
  useEffect(() => {
    if (!profile?.id) return;
    const profileId = Number(profile.id);
    if (!Number.isFinite(profileId)) return;
    let active = true;
    (async () => {
      try {
        const resp = await apiServices.getFollowStats(profileId);
        if (!active) return;
        setFollowStats(resp.data);
      } catch { /* silent */ }
    })();
    return () => { active = false; };
  }, [profile?.id]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    setTripsLoading(true);

    const rows = (resp: { data?: unknown }) => {
      const d = resp?.data as { trips?: unknown } | unknown[] | undefined;
      if (Array.isArray(d)) return d;
      if (d && Array.isArray((d as { trips?: unknown[] }).trips)) return (d as { trips: unknown[] }).trips;
      return [];
    };

    (async () => {
      const mine = await apiServices.getDashboardTrips(token).catch(() => null);
      if (!active) return;
      if (mine) setMyTrips(rows(mine) as any[]);
      setTripsLoading(false);
    })();
    return () => { active = false; };
  }, [token]);

  const handleTripClick = (trip: any) => {
    const id = trip.id || trip.Id;
    // tripPath, not `/trip/${id}` - this page was the only surface emitting a
    // bare-GUID link instead of the canonical slug the rest of the app shares.
    if (id) navigate(tripPath({ id, name: trip.name || trip.Name }), { state: { trip } });
  };

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : undefined;

  /*
   * The profile is a portfolio, not a workspace.
   *
   * It shows published trips only - the same thing a visitor sees at
   * /traveler/:userId. Saved, Liked and Archived moved to the Trips page: they
   * are private working state, and this page has a public twin, so keeping them
   * here meant one careless change away from showing strangers what you had
   * bookmarked. Every mutating action already lived on Trips - this page's own
   * "Plan a trip" button is a redirect to it.
   *
   * `isOwned` also matters: /api/trips/dashboard returns owned UNION
   * member-of, so the unfiltered list counted other people's trips as yours.
   */
  const myId = String(profile?.id ?? '');
  const ownedTrips = useMemo(() => {
    if (!myId) return [];
    return myTrips.filter((t) => {
      const ownerId = String(t.ownerUserId ?? t.OwnerUserId ?? t.owner?.id ?? t.Owner?.Id ?? '');
      return ownerId === myId;
    });
  }, [myTrips, myId]);

  const publishedTrips = useMemo(
    () => ownedTrips.filter((t) => {
      const published = t.published === true || t.isPublished === true
        || (t.status || '').toUpperCase() === 'PUBLISHED';
      return published && t.isArchived !== true;
    }),
    [ownedTrips],
  );

  // Countries you have actually travelled, from your own trips - this counted
  // across the shared-with-you trips too, inflating the passport.
  const uniqueCountries = useMemo(() => {
    const s = new Set<string>();
    ownedTrips.forEach(t => (t.countries || []).forEach((c: string) => s.add(c)));
    return s.size;
  }, [ownedTrips]);

  const displayTrips = publishedTrips;

  const PUBLISHED_EMPTY = {
    icon: IconRoute,
    title: 'Nothing published yet',
    description: ownedTrips.length > 0
      ? 'You have trips in progress. Publish one and it will appear here, and on your profile for other travellers.'
      : 'Plan a trip, publish it, and it becomes the first thing travellers see on your profile.',
    actionLabel: ownedTrips.length > 0 ? 'Go to my trips' : 'Start planning',
    onAction: () => navigate('/dashboard'),
  };

  // ── page states ──
  if (loading) {
    return (
      <Box sx={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ErrorState
          title="Couldn't load your profile"
          description={error}
          onRetry={() => dispatch(fetchUserProfile({ force: true }))}
        />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <EmptyState
          icon={IconUsers}
          title="Sign in to view your profile"
          description="Your trips, stats, and travel identity live here once you're signed in."
          actionLabel="Sign in"
          onAction={() => navigate('/signin')}
        />
      </Box>
    );
  }

  const fullName = [profile.fname, profile.lname].filter(Boolean).join(' ') || 'Tripician Explorer';
  const initials = [(profile.fname || '')[0], (profile.lname || '')[0]].filter(Boolean).join('').toUpperCase() || 'T';
  // Gate on the same test the rows use, or a profile whose fields are all
  // "Not Available" renders an About card with a heading and nothing under it.
  const hasDetails = [
    profile.email, profile.phone, profile.country,
    profile.gender && profile.gender !== 'NA' ? profile.gender : undefined,
    formatDate(profile.dateOfBirth),
  ].some((v) => presentable(v as string | undefined));
  const bannerSrc = (!coverFailed && profile.coverpicture) || defaultBanner;
  const locationLine = profile.location;

  const socials = [
    { url: profile.instagram, Icon: IconBrandInstagram, label: 'Instagram' },
    { url: profile.twitter, Icon: IconBrandX, label: 'X' },
    { url: profile.facebook, Icon: IconBrandFacebook, label: 'Facebook' },
    { url: profile.website, Icon: IconLink, label: 'Website' },
  ]
    .filter(s => s.url && !String(s.url).toUpperCase().includes('NULL'))
    .map(s => ({ ...s, url: safeExternalUrl(s.url) }))
    .filter((s): s is { url: string; Icon: typeof IconLink; label: string } => !!s.url);

  const statItems = [
    { value: myTrips.length, label: myTrips.length === 1 ? 'trip' : 'trips' },
    { value: uniqueCountries, label: uniqueCountries === 1 ? 'country' : 'countries' },
    { value: followStats.followers, label: followStats.followers === 1 ? 'follower' : 'followers' },
    { value: followStats.following, label: 'following' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box sx={{ maxWidth: CONTENT_MAX, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 3, md: 4 }, pb: 10 }}>
        <motion.div initial="hidden" animate="visible" variants={staggerContainer(0.08, 0.05)}>

          {/* ── Cover ── */}
          <motion.div variants={staggerItem}>
            <Box sx={{
              height: { xs: 150, sm: 200, md: 240 }, borderRadius: '20px', overflow: 'hidden',
              border: `1px solid ${theme.custom.surface.border}`,
              background: theme.custom.gradients.brandSubtle,
            }}>
              {bannerSrc && (
                <Box
                  component="img" src={bannerSrc} alt=""
                  onError={() => {
                    // Broken cover URL → try the Unsplash fallback; if that fails too, stay blank
                    if (!coverFailed && profile.coverpicture) setCoverFailed(true);
                    else setDefaultBanner(null);
                  }}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              )}
            </Box>
          </motion.div>

          {/* ── Identity row ── */}
          <motion.div variants={staggerItem}>
            <Box sx={{
              display: 'flex', gap: { xs: 2, sm: 3 },
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'flex-end' },
              px: { xs: 2, sm: 4 },
              mt: { xs: -5.5, sm: -6.5 },
              position: 'relative', zIndex: 1,
            }}>
              <Avatar
                src={profile.profilepicture || undefined}
                sx={{
                  width: { xs: 96, sm: 112 }, height: { xs: 96, sm: 112 },
                  fontSize: '2.4rem', bgcolor: 'primary.main', color: '#fff',
                  border: `4px solid ${theme.palette.background.default}`,
                  boxShadow: theme.custom.shadows.card,
                  flexShrink: 0,
                }}
              >
                {!profile.profilepicture && initials}
              </Avatar>

              <Box sx={{ flex: 1, minWidth: 0, pb: 0.5}}>
                <Typography component="h1" variant="h2" noWrap sx={{
                  fontFamily: theme.custom.fontDisplay, color: 'text.primary',
                }}>
                  {fullName}
                </Typography>
                {locationLine && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, color: 'text.secondary' }}>
                    <IconMapPin size={14} stroke={1.9} />
                    <Typography noWrap sx={{ fontSize: 13.5 }}>{locationLine}</Typography>
                  </Box>
                )}
              </Box>

              {/* Actions */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 0.5 }}>
                {socials.map(({ url, Icon, label }) => (
                  <Tooltip key={label} title={label}>
                    <IconButton
                      component="a" href={url} target="_blank" rel="noopener noreferrer" size="small"
                      sx={{ color: 'text.secondary', border: `1px solid ${theme.custom.surface.border}`, '&:hover': { color: 'text.primary' } }}
                    >
                      <Icon size={16} stroke={1.9} />
                    </IconButton>
                  </Tooltip>
                ))}
                <Button variant="outlined" size="small" onClick={() => navigate('/settings')}>
                  Edit profile
                </Button>
              </Box>
            </Box>
          </motion.div>

          {/* ── Stats row ── */}
          <motion.div variants={staggerItem}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap', px: { xs: 2, sm: 4 }, mt: 2 }}>
              {statItems.map(s => (
                <Typography key={s.label} sx={{ fontSize: 14, color: 'text.secondary' }}>
                  <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{s.value}</Box> {s.label}
                </Typography>
              ))}
            </Box>
          </motion.div>

          {/* ── Content: trips + sidebar ── */}
          <Box sx={{
            display: 'flex', gap: { xs: 0, lg: 4 },
            flexDirection: { xs: 'column', lg: 'row' },
            alignItems: 'flex-start',
            mt: { xs: 3.5, md: 4.5 },
          }}>
            {/* Trips */}
            <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
              <motion.div variants={staggerItem}>
                {/* One section, no tabs: this page shows published trips and
                    nothing else. The drafts, saved and liked lists live on Trips,
                    where you can actually act on them. */}
                <Box sx={{
                  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1.5,
                  pb: 1.5, borderBottom: `1px solid ${theme.custom.surface.border}`,
                }}>
                  <Box>
                    <Typography variant="h5" sx={{ color: 'text.primary' }}>
                      Published trips{publishedTrips.length ? ` · ${publishedTrips.length}` : ''}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.25 }}>
                      What other travellers see when they visit your profile.
                    </Typography>
                  </Box>
                  <Button
                    variant="text" size="small"
                    endIcon={<IconArrowRight size={15} />}
                    onClick={() => navigate('/dashboard')}
                    sx={{ flexShrink: 0, display: { xs: 'none', sm: 'inline-flex' } }}
                  >
                    All my trips
                  </Button>
                </Box>
              </motion.div>

              <Box sx={{ mt: 3 }}>
                {tripsLoading ? (
                  <CardGridSkeleton count={6} minWidth={260} />
                ) : displayTrips.length === 0 ? (
                  <EmptyState {...PUBLISHED_EMPTY} />
                ) : (
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                    gap: 2.5, alignItems: 'stretch',
                  }}>
                    {displayTrips.map((trip, i) => (
                      <ProfileTripCard
                        key={trip.id || i}
                        trip={trip}
                        onClick={() => handleTripClick(trip)}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            </Box>

            {/* Sidebar */}
            <Box sx={{ width: { xs: '100%', lg: 300 }, flexShrink: 0, mt: { xs: 4, lg: 0 } }}>
              <motion.div variants={staggerItem}>

                {/* Travel passport - the sidebar's anchor.
                    The three numbers lead because they are the answer to "who is
                    this traveller"; the vibe bars were carrying that job alone
                    and two thin bars reading 22% and 11% say very little. */}
                {vibePassport && (
                  <SideCard title="Travel passport">
                    <Box sx={{ display: 'flex', mb: vibePassport.vibes.length > 0 ? 2.25 : 0 }}>
                      {[
                        { value: myTrips.length, label: myTrips.length === 1 ? 'trip' : 'trips' },
                        { value: uniqueCountries, label: uniqueCountries === 1 ? 'country' : 'countries' },
                        { value: vibePassport.totalNights, label: 'nights' },
                      ].map((stat, i) => (
                        <Box
                          key={stat.label}
                          sx={{
                            flex: 1, minWidth: 0, textAlign: 'center',
                            borderLeft: i > 0 ? `1px solid ${theme.palette.divider}` : 'none',
                          }}
                        >
                          <Typography sx={{ fontSize: 20, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', color: 'text.primary' }}>
                            {stat.value}
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.15 }}>
                            {stat.label}
                          </Typography>
                        </Box>
                      ))}
                    </Box>

                    {vibePassport.vibes.slice(0, 4).map((v) => (
                      <Box key={v.name} sx={{ mb: 1.25 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
                          <Typography sx={{ fontSize: 12.5, fontWeight: 600, textTransform: 'capitalize', color: 'text.primary' }}>
                            {v.name}
                          </Typography>
                          <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: 'text.disabled' }}>
                            {v.percentage}%
                          </Typography>
                        </Box>
                        {/* Hand-rolled rather than LinearProgress: the track needs
                            to stay visible at these small percentages, and the
                            fill carries the brand gradient. */}
                        <Box sx={{ height: 5, borderRadius: 99, bgcolor: theme.custom.surface.active, overflow: 'hidden' }}>
                          <Box sx={{
                            width: `${Math.max(2, Math.min(100, v.percentage))}%`,
                            height: '100%', borderRadius: 99,
                            background: theme.custom.gradients.brand,
                            transition: `width ${theme.custom.motion.duration.slow} ${theme.custom.motion.easing.standard}`,
                          }} />
                        </Box>
                      </Box>
                    ))}

                    {vibePassport.topCountries.length > 0 && (
                      <Box sx={{ mt: 1.75, pt: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}>
                        <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.disabled', mb: 1 }}>
                          Been to
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
                          {vibePassport.topCountries.slice(0, 8).map((c) => (
                            <Chip key={c} label={c} size="small" variant="outlined" sx={{ fontSize: 11.5, height: 24 }} />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </SideCard>
                )}

                {hasDetails && (
                  <SideCard title="About">
                    <DetailRow Icon={IconMail} label="Email" value={profile.email} />
                    <DetailRow Icon={IconPhone} label="Phone" value={profile.phone} />
                    <DetailRow Icon={IconWorld} label="Country" value={profile.country} />
                    <DetailRow Icon={IconGenderBigender} label="Gender" value={profile.gender && profile.gender !== 'NA' ? profile.gender : undefined} />
                    <DetailRow Icon={IconCake} label="Date of birth" value={formatDate(profile.dateOfBirth)} />
                  </SideCard>
                )}

                {Array.isArray(profile.bio?.highlights) && profile.bio!.highlights.length > 0 && (
                  <SideCard title="Highlights">
                    {profile.bio!.highlights.map((h: any, i: number) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 0.75 }}>
                        <Box sx={{ fontSize: 17, lineHeight: 1, flexShrink: 0, display: 'flex', alignItems: 'center', color: 'primary.main' }}>
                          <HighlightIcon icon={h.icon} />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.3 }}>
                            {h.label}
                          </Typography>
                          <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 500, color: 'text.primary' }}>
                            {h.value}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </SideCard>
                )}
              </motion.div>
            </Box>
          </Box>
        </motion.div>
      </Box>
    </Box>
  );
};

export default Profile;
