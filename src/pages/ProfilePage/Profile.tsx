/**
 * /profile , the personal hub.
 *
 * This page and /dashboard were the same idea in two places: both read
 * `getDashboardTrips`, both listed your trips, and Profile's only way to reach
 * the rest of them was a button back to Dashboard. Dashboard's seven tabs and
 * this page's published-only grid have merged into four tabs here, and "Trips"
 * has left the main navigation.
 *
 * The old split was documented as protecting the *public* twin at
 * /traveler/:userId from leaking saved and archived trips. That still holds and
 * is why this page is auth-gated and TravelerProfile is a separate component:
 * nothing private below is reachable from the public route.
 */

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Avatar, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, IconButton, Skeleton, Snackbar, Tab, Tabs, Tooltip, Typography, useTheme,
} from '@mui/material';
import { motion } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  IconArchive,
  IconMessages,
  IconBook,
  IconBookmark,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandX,
  IconLink,
  IconMapPin,
  IconMapPlus,
  IconUsers,
} from '@tabler/icons-react';
import type { RootState, AppDispatch } from '../../store';
import { fetchUserProfile } from '../../store/userSlice';
import { apiServices } from '../../services/APIs/apiServices';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { useAppShell } from '../PageLayout/AppShellContext';
import { fetchUnsplashImage } from '../../services/unsplashService';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import FilterChip from '../../components/ui/FilterChip';
import SectionHeader from '../../components/ui/SectionHeader';
import { CardGridSkeleton, ListSkeleton } from '../../components/ui/Skeletons';
import TripCard from '../DashboardPage/TripCard';
import TripShareModal from '../../components/TripShareModal';
import Seo from '../../components/Seo';
import StoryCard from '../../afterstory/cards/StoryCard';
import BookPreviewDialog from '../../afterstory/book/BookPreviewDialog';
import { afterStoryService } from '../../afterstory/afterStoryService';
import type { AfterStorySummaryDto } from '../../afterstory/types';
import { FEATURE_FLAGS } from '../../config/featureFlags';
import { staggerContainer, staggerItem } from '../../utils/animations';
import { safeExternalUrl } from '../../utils/sanitizeHtml';
import { tripPath } from '../../utils/tripSlug';
import { mapTripVM, rowsFrom, type TripVM } from './tripViewModel';
import { passportViewFromDto, type VibePassport } from './ProfilePassport';
import TravelConstellation from './TravelConstellation';
import ProfileIdentityRail from './ProfileIdentityRail';
import { pickDefaultTab, type TabId } from './profileTabs';
import PostComposer from '../../posts/PostComposer';
import PostCard from '../../posts/PostCard';
import { postsService } from '../../posts/postsService';
import type { TravelerPost } from '../../posts/types';
import IdentityVerifiedMark from '../../components/ui/IdentityVerifiedMark';
import NextTripCard from './NextTripCard';
import JoinRequestsInbox from '../../seats/JoinRequestsInbox';

/** Community's measure. This page sat at 1200 and TravelerProfile at 1140, so
 *  three sibling pages disagreed on where the content edge was. */
const CONTENT_MAX = 1280;

/** How many posts the road tab asks for at a time. */
const ROAD_PAGE = 50;

type TripFilter = 'all' | 'mine' | 'shared' | 'published';

const TRIP_FILTERS: { id: TripFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'Mine' },
  { id: 'shared', label: 'Shared with me' },
  { id: 'published', label: 'Published' },
];

// Default banner fetched once from Unsplash, personalised by the user's location.
const _defaultBannerCache: Record<string, string> = {};

async function loadDefaultBanner(place: string): Promise<string | null> {
  const key = place.trim().toLowerCase();
  if (_defaultBannerCache[key]) return _defaultBannerCache[key];

  for (const q of [`${place} landscape travel`, `${place} aerial scenery`, `${place} nature travel`]) {
    const url = await fetchUnsplashImage(q);
    if (url) {
      _defaultBannerCache[key] = url;
      return url;
    }
  }
  return null;
}

// ── main ───────────────────────────────────────────────────────────────────

const Profile: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { token } = useAuthToken();
  const { openCreateTrip } = useAppShell();
  const [searchParams, setSearchParams] = useSearchParams();

  const { profile, loading, error } = useSelector((state: RootState) => state.user);

  const rawTab = searchParams.get('tab');
  const setActiveTab = (next: TabId) =>
    setSearchParams(
      (prev) => {
        prev.set('tab', next);
        return prev;
      },
      { replace: true },
    );

  const [allTrips, setAllTrips] = useState<TripVM[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [tripFilter, setTripFilter] = useState<TripFilter>('all');

  const [savedTrips, setSavedTrips] = useState<TripVM[]>([]);
  const [likedTrips, setLikedTrips] = useState<TripVM[]>([]);
  const [savedStories, setSavedStories] = useState<AfterStorySummaryDto[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const savedFetched = useRef(false);

  /*
   * Posts load eagerly, unlike stories and saved, which wait for their tab.
   *
   * They have to: which tab OPENS depends on whether there are any, so the
   * answer is needed before the strip can settle on a selection.
   */
  const [posts, setPosts] = useState<TravelerPost[]>([]);
  const [postsResolved, setPostsResolved] = useState(false);
  const [postsMore, setPostsMore] = useState(false);
  const [postsPaging, setPostsPaging] = useState(false);

  /*
   * Null means "not knowable yet", not "trips".
   *
   * Guessing while the posts request is in flight and correcting on arrival
   * would flip the panel out from under whoever was already reading it. Only a
   * cold landing ever sees this, because every tab change writes `?tab=`.
   */
  const activeTab = pickDefaultTab({ requested: rawTab, postsResolved, hasPosts: posts.length > 0 });


  const [myStories, setMyStories] = useState<AfterStorySummaryDto[]>([]);
  // Which story's book is open. Only ever set from the author's own tab: the
  // preview endpoint is authorship-gated, so offering it on a saved story would
  // be an action that always fails.
  const [bookStory, setBookStory] = useState<AfterStorySummaryDto | null>(null);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const storiesFetched = useRef(false);

  const [followStats, setFollowStats] = useState({ followers: 0, following: 0 });
  const [followLoading, setFollowLoading] = useState(true);
  // Shape declared once, in the component that renders it. It used to be spelled
  // out inline here AND in the sidebar, so the two could drift apart silently.
  const [vibePassport, setVibePassport] = useState<VibePassport | null>(null);
  const [passportLoading, setPassportLoading] = useState(true);

  const [defaultBanner, setDefaultBanner] = useState<string | null>(null);
  const [coverFailed, setCoverFailed] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<TripVM | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [shareTrip, setShareTrip] = useState<TripVM | null>(null);

  useEffect(() => {
    dispatch(fetchUserProfile());
  }, [dispatch]);

  // Cover fallback: Unsplash scenery for the user's location. No location on
  // file means no fetch, and the cover stays a clean blank band.
  useEffect(() => {
    let cancelled = false;
    const place = profile?.location?.trim() || profile?.country?.trim();
    if (!place) {
      setDefaultBanner(null);
      return;
    }
    void loadDefaultBanner(place).then((url) => {
      if (!cancelled) setDefaultBanner(url);
    });
    return () => {
      cancelled = true;
    };
  }, [profile?.location, profile?.country]);

  // Both of these fetches used to have no loading flag at all, so the page
  // painted "0 trips - 0 countries - 0 followers" as though those were facts and
  // then swapped them for real numbers. A zero is a claim; it must not paint
  // before it is known.
  useEffect(() => {
    if (!token) return;
    let active = true;
    setPassportLoading(true);
    void apiServices
      .getVibePassport(token)
      .then((resp) => {
        if (active) setVibePassport(resp.data);
      })
      .catch(() => {
        /* optional enrichment */
      })
      .finally(() => {
        if (active) setPassportLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    const profileId = Number(profile?.id);
    if (!Number.isFinite(profileId)) return;
    let active = true;
    setFollowLoading(true);
    void apiServices
      .getFollowStats(profileId)
      .then((resp) => {
        if (active) setFollowStats(resp.data);
      })
      .catch(() => {
        /* silent */
      })
      .finally(() => {
        if (active) setFollowLoading(false);
      });
    return () => {
      active = false;
    };
  }, [profile?.id]);

  // The one trips fetch. This page and Dashboard each ran their own.
  useEffect(() => {
    if (!token) return;
    let active = true;
    setTripsLoading(true);

    void apiServices
      .getDashboardTrips(token)
      .then((resp) => {
        if (!active) return;
        setAllTrips(rowsFrom(resp?.data).map((t) => mapTripVM(t, profile)));
      })
      .catch(() => {
        if (active) setAllTrips([]);
      })
      .finally(() => {
        if (active) setTripsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, profile]);

  // Matched on the id in the reply rather than a cleanup flag, the pattern the
  // credibility strip and the constellation both settled on.
  useEffect(() => {
    const id = Number(profile?.id);
    // Resolved, not abandoned. Bailing out silently would leave the tab strip
    // with no selection and a skeleton forever, since nothing else ever sets it.
    if (!Number.isFinite(id) || id <= 0) { setPostsResolved(true); return; }
    let wanted = id;
    void postsService.byAuthor(id, ROAD_PAGE)
      .then((rows) => {
        if (wanted !== id) return;
        setPosts(rows);
        setPostsMore(rows.length >= ROAD_PAGE);
      })
      .finally(() => { if (wanted === id) setPostsResolved(true); });
    return () => { wanted = -1; };
  }, [profile?.id]);

  // Saved and stories load on first visit to their tab. Fetching four more lists
  // on mount would slow the tab everyone actually opens.
  useEffect(() => {
    if (activeTab !== 'saved' || savedFetched.current || !token) return;
    savedFetched.current = true;
    setSavedLoading(true);

    void Promise.allSettled([
      apiServices.getSavedTrips(token),
      apiServices.getLikedTrips(token),
      FEATURE_FLAGS.afterStory ? afterStoryService.listSaved() : Promise.resolve([]),
    ]).then(([saved, liked, stories]) => {
      if (saved.status === 'fulfilled') {
        setSavedTrips(rowsFrom(saved.value?.data).map((t) => mapTripVM(t, profile)));
      }
      if (liked.status === 'fulfilled') {
        setLikedTrips(rowsFrom(liked.value?.data).map((t) => mapTripVM(t, profile)));
      }
      if (stories.status === 'fulfilled') setSavedStories(stories.value as AfterStorySummaryDto[]);
      setSavedLoading(false);
    });
  }, [activeTab, token, profile]);

  useEffect(() => {
    if (activeTab !== 'stories' || storiesFetched.current || !FEATURE_FLAGS.afterStory) return;
    storiesFetched.current = true;
    setStoriesLoading(true);

    void afterStoryService
      .listMine()
      .then(setMyStories)
      .catch(() => setMyStories([]))
      .finally(() => setStoriesLoading(false));
  }, [activeTab]);

  // ── derived ──────────────────────────────────────────────────────────────

  const loadMorePosts = async () => {
    const oldest = posts[posts.length - 1];
    if (!oldest || postsPaging) return;
    setPostsPaging(true);
    const id = Number(profile?.id);
    const older = await postsService.byAuthor(id, ROAD_PAGE, oldest.createdAt);
    setPosts((prev) => [...prev, ...older]);
    setPostsMore(older.length >= ROAD_PAGE);
    setPostsPaging(false);
  };

  const activeTrips = useMemo(() => allTrips.filter((t) => !t.isArchived), [allTrips]);
  const archivedTrips = useMemo(() => allTrips.filter((t) => t.isArchived), [allTrips]);
  const ownedTrips = useMemo(() => activeTrips.filter((t) => t.isOwner), [activeTrips]);

  const filteredTrips = useMemo(() => {
    switch (tripFilter) {
      case 'mine':
        return ownedTrips;
      case 'shared':
        return activeTrips.filter((t) => !t.isOwner);
      case 'published':
        return activeTrips.filter((t) => t.isPublished);
      default:
        return activeTrips;
    }
  }, [tripFilter, activeTrips, ownedTrips]);

  const nextUpcoming = useMemo(() => {
    const today = new Date().setHours(0, 0, 0, 0);
    return (
      ownedTrips
        .filter((t) => t.startDate && new Date(t.startDate).getTime() > today)
        .sort((a, b) => new Date(a.startDate as string).getTime() - new Date(b.startDate as string).getTime())[0] ??
      null
    );
  }, [ownedTrips]);

  const openTrip = useCallback(
    (t: TripVM) => {
      if (t.id) navigate(tripPath({ id: t.id, name: t.title }), { state: { trip: t } });
    },
    [navigate],
  );

  const handleDelete = async () => {
    if (!deleteTarget || !token) return;
    setDeleting(true);
    try {
      await apiServices.deleteTrip(token, deleteTarget.id);
      setAllTrips((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setSnackbar('Trip deleted.');
    } catch {
      setSnackbar('Could not delete that trip.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const goLive = async (t: TripVM) => {
    if (!token) return;
    try {
      await apiServices.setTripStatus(token, t.id, 1);
      setAllTrips((prev) => prev.map((x) => (x.id === t.id ? { ...x, tripStatus: 1 } : x)));
      setSnackbar('Trip is live.');
    } catch {
      setSnackbar('Could not start that trip.');
    }
  };


  // ── page states ──────────────────────────────────────────────────────────

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
          description="Your trips, stories, stats and travel identity live here once you're signed in."
          actionLabel="Sign in"
          onAction={() => navigate('/signin')}
        />
      </Box>
    );
  }

  const fullName = [profile.fname, profile.lname].filter(Boolean).join(' ') || 'Tripician Explorer';
  const initials =
    [(profile.fname || '')[0], (profile.lname || '')[0]].filter(Boolean).join('').toUpperCase() || 'T';

  const bannerSrc = (!coverFailed && profile.coverpicture) || defaultBanner;


  const socials = [
    { url: profile.instagram, Icon: IconBrandInstagram, label: 'Instagram' },
    { url: profile.twitter, Icon: IconBrandX, label: 'X' },
    { url: profile.facebook, Icon: IconBrandFacebook, label: 'Facebook' },
    { url: profile.website, Icon: IconLink, label: 'Website' },
  ]
    .filter((s) => s.url && !String(s.url).toUpperCase().includes('NULL'))
    .map((s) => ({ ...s, url: safeExternalUrl(s.url) }))
    .filter((s): s is { url: string; Icon: typeof IconLink; label: string } => Boolean(s.url));

  // Each figure carries the loading flag of the request that produces it, so a
  // slow follow-stats call cannot make the page claim you have no followers
  // while the trip counts are already correct beside it.
  /*
   * Followers and following only.
   *
   * Trips and countries used to sit here too, counted from owned trips in this
   * component, directly above a passport band counting them differently on the
   * server. The page showed "44 countries" and "8 COUNTRIES" at the same time.
   * One question, one answer, and the passport owns this one.
   */
  const statItems = [
    {
      value: followStats.followers,
      label: followStats.followers === 1 ? 'follower' : 'followers',
      loading: followLoading,
    },
    { value: followStats.following, label: 'following', loading: followLoading },
  ];

  // Three-up from md, matching Community and TravelerProfile. The identity rail
  // only appears from lg, by which point the remaining lane is around 840px, so
  // three cards still land near the 260px the rest of the site uses. It is the
  // md range, where there is no rail at all, that gets the full width.
  const tripGridSx = {
    display: 'grid',
    gridTemplateColumns: {
      xs: '1fr',
      sm: 'repeat(2, minmax(0, 1fr))',
      md: 'repeat(3, minmax(0, 1fr))',
    },
    gap: 3,
  } as const;

  const savedCount = savedTrips.length + likedTrips.length + savedStories.length;

  /*
   * Built once and rendered twice: sticky beside the content from lg, inline
   * above it below that. Two call sites would drift, and the rail is a summary
   * of the same person either way.
   */
  const railNode = (
    <ProfileIdentityRail
      userId={Number.isFinite(Number(profile?.id)) ? Number(profile?.id) : undefined}
      passport={passportViewFromDto(vibePassport)}
      passportLoading={passportLoading}
      profile={profile}
      isOwner
      onEdit={() => navigate('/settings')}
      onPlanTrip={openCreateTrip}
      onFindCrew={(q) => navigate(q ? `/crew?q=${encodeURIComponent(q)}` : '/crew')}
      onOpenTraveller={(id) => navigate(`/traveler/${id}`)}
      onOpenTrip={openTrip}
      viewerId={Number.isFinite(Number(profile?.id)) ? Number(profile?.id) : undefined}
      token={token}
    />
  );

  const renderTripGrid = (list: TripVM[]) => (
    <Box sx={tripGridSx}>
      {list.map((t) => (
        <TripCard
          key={t.id}
          title={t.title}
          countries={t.countries}
          vibe={t.vibe}
          description={t.description}
          image={t.image}
          progress={t.progress}
          createdAt={t.createdAt}
          updatedAt={t.updatedAt}
          nights={t.nights}
          owner={t.owner}
          members={t.members}
          tripStatus={t.tripStatus}
          verified={t.verified}
          verifiedAt={t.verifiedAt}
          isOwner={t.isOwner}
          commentsCount={t.commentsCount}
          onClick={() => openTrip(t)}
          onShare={(e) => {
            e.stopPropagation();
            setShareTrip(t);
          }}
          {...(t.isOwner
            ? {
                onDelete: (e: React.MouseEvent) => {
                  e.stopPropagation();
                  setDeleteTarget(t);
                },
              }
            : {})}
          {...(t.isOwner && t.tripStatus === 0 ? { onGoLive: () => void goLive(t) } : {})}
        />
      ))}
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Private page: it must never be indexed, and it emitted no head tags at
          all before this, so it inherited whatever the previous route set. */}
      <Seo
        title={`${fullName}`}
        description="Your trips, stories, saved itineraries and travel passport."
        path="/profile"
        noindex
      />
      <Box sx={{ maxWidth: CONTENT_MAX, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 3, md: 4 }, pb: 10 }}>
        <motion.div initial="hidden" animate="visible" variants={staggerContainer(0.08, 0.05)}>

          {/* ── Cover ── */}
          <motion.div variants={staggerItem}>
            <Box
              sx={{
                height: { xs: 150, sm: 200, md: 240 },
                borderRadius: '20px',
                overflow: 'hidden',
                border: `1px solid ${theme.custom.surface.border}`,
                background: theme.custom.gradients.brandSubtle,
              }}
            >
              {bannerSrc && (
                <Box
                  component="img"
                  src={bannerSrc}
                  alt=""
                  onError={() => {
                    // Broken cover URL, try the Unsplash fallback; if that fails
                    // too, stay blank rather than showing a broken image icon.
                    if (!coverFailed && profile.coverpicture) setCoverFailed(true);
                    else setDefaultBanner(null);
                  }}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              )}
            </Box>
          </motion.div>

          {/* ── Avatar ──
              ONLY the avatar overlaps the cover. Everything else sits below it.
              When the masthead moved from h2 to h1 the text block grew to ~70px
              and, aligned to the bottom of a 112px avatar pulled 52px upward, its
              first line landed inside the photograph: the name rendered in dark
              serif across a dark image and was close to unreadable. A long name
              wrapping to two lines climbed further still. Type belongs on the
              page, never over an image nobody chose for legibility. */}
          <motion.div variants={staggerItem}>
            <Box sx={{ mt: { xs: -5.5, sm: -6.5 }, position: 'relative', zIndex: 1, display: 'flex' }}>
              {/* The mark anchors to the avatar, so the avatar needs its own
                  positioning context. The row around it is full width. */}
              <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
                <Avatar
                  src={profile.profilepicture || undefined}
                  sx={{
                    width: { xs: 96, sm: 112 },
                    height: { xs: 96, sm: 112 },
                    fontSize: '2.4rem',
                    bgcolor: 'primary.main',
                    color: '#fff',
                    border: `4px solid ${theme.palette.background.default}`,
                    boxShadow: theme.custom.shadows.card,
                    flexShrink: 0,
                  }}
                >
                  {!profile.profilepicture && initials}
                </Avatar>
                <IdentityVerifiedMark verified={!!profile.identityVerifiedAt} size={26} />
              </Box>
            </Box>
          </motion.div>

          {/* ── Identity ── */}
          <motion.div variants={staggerItem}>
            <Box
              sx={{
                display: 'flex',
                gap: { xs: 2, sm: 3 },
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'flex-start' },
                justifyContent: 'space-between',
                // No horizontal inset. This used to carry px: {xs:2, sm:4} on top
                // of the page's own padding, so the name started 32px right of
                // the passport, the tabs and every card underneath it.
                px: 0,
                mt: 1.5,
              }}
            >
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  component="h1"
                  variant="h1"
                  sx={{ color: 'text.primary' }}
                >
                  {fullName}
                </Typography>
                {profile.location && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, color: 'text.secondary' }}>
                    <IconMapPin size={14} stroke={1.9} />
                    <Typography variant="body2" noWrap>
                      {profile.location}
                    </Typography>
                  </Box>
                )}

                {/* Stats sit under the name, not in their own band, so the
                    identity reads as one block. */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap', mt: 1.5 }}>
                  {statItems.map((s) =>
                    s.loading ? (
                      <Skeleton key={s.label} variant="text" width={78} height={20} />
                    ) : (
                      <Typography key={s.label} variant="body2" sx={{ color: 'text.secondary' }}>
                        <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                          {s.value}
                        </Box>{' '}
                        {s.label}
                      </Typography>
                    ),
                  )}
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, pt: { sm: 1 } }}>
                {socials.map(({ url, Icon, label }) => (
                  <Tooltip key={label} title={label}>
                    <IconButton
                      component="a"
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      sx={{
                        color: 'text.secondary',
                        border: `1px solid ${theme.custom.surface.border}`,
                        '&:hover': { color: 'text.primary' },
                      }}
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

          {/* ── Two columns from here down ──
              Who you are on the right, what you have done on the left. The rail
              is a column of facts about the person: figures, corroboration, your
              own words, how to reach you. The lane beside it is your work, which
              is what needs the width. Below lg the rail rejoins the flow at the
              top rather than being a desktop-only ornament. */}
          <Box
            sx={{
              display: 'flex',
              gap: { xs: 0, lg: 4 },
              alignItems: 'flex-start',
              mt: { xs: 2.5, md: 3 },
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {/* The rail, inline, below lg. */}
              <Box sx={{ display: { xs: 'block', lg: 'none' }, mb: { xs: 3, md: 4 } }}>
                {railNode}
              </Box>

                {/* ── Where you have been, and how much of it anyone can confirm ──
                    Replaces the eight-flag row the passport used to carry. On your
                    own profile it also draws unpublished countries, as locked, so
                    it cannot disagree with the figures in the rail. */}
                {Number.isFinite(Number(profile?.id)) ? (
                  <motion.div variants={staggerItem}>
                    <TravelConstellation userId={Number(profile?.id)} isOwner />
                  </motion.div>
                ) : null}

            {/* ── Next trip ── */}
            {!tripsLoading && nextUpcoming && (
              <motion.div variants={staggerItem}>
                <NextTripCard trip={nextUpcoming} onOpen={() => openTrip(nextUpcoming)} />
              </motion.div>
            )}

            {/* ── Requests waiting on you ──
                Above the tabs, because somebody is waiting on an answer and that
                outranks browsing your own trips. Renders nothing when the inbox is
                empty, so it never becomes a standing reminder that nobody asked. */}
            <motion.div variants={staggerItem}>
              <JoinRequestsInbox />
            </motion.div>

            {/* ── Tabs ──
                Single column since the sidebar went. That is what returns the
                grids below to three-up, matching Community and TravelerProfile
                instead of being the one page stuck at two. */}
            <motion.div variants={staggerItem}>
              <Box sx={{ mt: { xs: 5, md: 6 }, minWidth: 0 }}>
                <Tabs
                  // false, not a guess. While the posts request decides which
                  // tab opens, no tab is underlined rather than the wrong one.
                  value={activeTab ?? false}
                  onChange={(_, v: TabId) => setActiveTab(v)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ borderBottom: `1px solid ${theme.custom.surface.border}`, minHeight: 44, mb: 3 }}
                >
                  {/* No count when the first page came back full: posts are
                      paged and the endpoint returns no total, so a number there
                      would be the page size wearing a count's clothes. */}
                  <Tab
                    value="road"
                    label={`From the road${!postsMore && posts.length ? ` (${posts.length})` : ''}`}
                    disableRipple
                  />
                  <Tab value="trips" label={`Trips${activeTrips.length ? ` (${activeTrips.length})` : ''}`} disableRipple />
                  {FEATURE_FLAGS.afterStory && (
                    <Tab
                      value="stories"
                      label={`Stories${myStories.length ? ` (${myStories.length})` : ''}`}
                      disableRipple
                    />
                  )}
                  <Tab value="saved" label={`Saved${savedCount ? ` (${savedCount})` : ''}`} disableRipple />
                  <Tab
                    value="archived"
                    label={`Archived${archivedTrips.length ? ` (${archivedTrips.length})` : ''}`}
                    disableRipple
                  />
                </Tabs>

                {/* While the posts request decides which tab opens, neither
                    panel paints. Showing trips and swapping to the road a moment
                    later is the flip this whole arrangement exists to avoid. */}
                {activeTab === null && <ListSkeleton rows={4} />}

                {/* ══ From the road ══ */}
                {activeTab === 'road' && (
                  <>
                    {/* The composer, not a button that sends you elsewhere to
                        write. Same component Community and /posts mount, and
                        onPosted prepends rather than refetching. */}
                    <Box sx={{ mb: 3 }}>
                      <PostComposer onPosted={(post) => setPosts((prev) => [post, ...prev])} />
                    </Box>

                    {posts.length === 0 ? (
                      <EmptyState
                        icon={IconMessages}
                        title="Nothing from the road yet"
                        description="A note, a photo, or a question for people who have been where you are going. Short is fine."
                      />
                    ) : (
                      <Box sx={{ display: 'grid', gap: 1.5 }}>
                        {posts.map((post) => (
                          <PostCard
                            key={post.id}
                            post={post}
                            onRemoved={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))}
                          />
                        ))}
                      </Box>
                    )}

                    {postsMore && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                        <Button variant="outlined" onClick={() => void loadMorePosts()} disabled={postsPaging}>
                          {postsPaging ? 'Loading...' : 'Show more'}
                        </Button>
                      </Box>
                    )}
                  </>
                )}

                {/* ══ Trips ══ */}
                {activeTab === 'trips' && (
                  <>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                      {TRIP_FILTERS.map((f) => (
                        <FilterChip
                          key={f.id}
                          label={f.label}
                          active={tripFilter === f.id}
                          onClick={() => setTripFilter(f.id)}
                        />
                      ))}
                    </Box>

                    {tripsLoading ? (
                      <CardGridSkeleton count={4} minWidth={260} />
                    ) : filteredTrips.length === 0 ? (
                      <EmptyState
                        icon={IconMapPlus}
                        title={tripFilter === 'all' ? 'No trips yet' : 'Nothing here'}
                        description={
                          tripFilter === 'shared'
                            ? 'When someone adds you to their trip, it will show up here.'
                            : tripFilter === 'published'
                              ? 'Publish a trip and it becomes the first thing travellers see on your profile.'
                              : 'Plan your first trip and it will live here.'
                        }
                        {...(tripFilter === 'all' || tripFilter === 'mine'
                          ? { actionLabel: 'Plan a trip', onAction: openCreateTrip }
                          : { actionLabel: 'Browse the community', onAction: () => navigate('/community') })}
                      />
                    ) : (
                      renderTripGrid(filteredTrips)
                    )}
                  </>
                )}

                {/* ══ Stories ══ */}
                {activeTab === 'stories' && FEATURE_FLAGS.afterStory && (
                  <>
                    {storiesLoading ? (
                      <CardGridSkeleton count={4} minWidth={260} />
                    ) : myStories.length === 0 ? (
                      <EmptyState
                        icon={IconBook}
                        title="No stories yet"
                        description="Write up a trip you took. If you planned it here, the shape of it is already done for you."
                        actionLabel="Browse stories"
                        onAction={() => navigate('/stories')}
                      />
                    ) : (
                      <Box sx={tripGridSx}>
                        {myStories.map((s) => (
                          <StoryCard key={s.id} story={s} onBook={setBookStory} />
                        ))}
                      </Box>
                    )}
                  </>
                )}

                {/* ══ Saved ══ */}
                {activeTab === 'saved' && (
                  <>
                    {savedLoading ? (
                      <CardGridSkeleton count={4} minWidth={260} />
                    ) : savedTrips.length === 0 && likedTrips.length === 0 && savedStories.length === 0 ? (
                      <EmptyState
                        icon={IconBookmark}
                        title="Nothing saved yet"
                        description="Save a trip or a story from the community and it will wait for you here."
                        actionLabel="Browse the community"
                        onAction={() => navigate('/community')}
                      />
                    ) : (
                      <Box sx={{ display: 'grid', gap: 5 }}>
                        {savedTrips.length > 0 && (
                          <Box>
                            <SectionHeader title="Saved trips" subtitle="Itineraries you bookmarked" />
                            {renderTripGrid(savedTrips)}
                          </Box>
                        )}
                        {likedTrips.length > 0 && (
                          <Box>
                            <SectionHeader title="Liked trips" />
                            {renderTripGrid(likedTrips)}
                          </Box>
                        )}
                        {savedStories.length > 0 && (
                          <Box>
                            <SectionHeader title="Saved stories" subtitle="Your reading list" />
                            <Box sx={tripGridSx}>
                              {savedStories.map((s) => (
                                <StoryCard key={s.id} story={s} />
                              ))}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    )}
                  </>
                )}

                {/* ══ Archived ══ */}
                {activeTab === 'archived' && (
                  <>
                    {tripsLoading ? (
                      <CardGridSkeleton count={4} minWidth={260} />
                    ) : archivedTrips.length === 0 ? (
                      <EmptyState
                        icon={IconArchive}
                        title="Nothing archived"
                        description="Trips you archive are kept here, out of the way but never deleted."
                      />
                    ) : (
                      renderTripGrid(archivedTrips)
                    )}
                  </>
                )}
              </Box>
            </motion.div>
            </Box>

            <Box
              sx={{
                display: { xs: 'none', lg: 'block' },
                width: 340,
                flexShrink: 0,
                position: 'sticky',
                top: 72,
              }}
            >
              {railNode}
            </Box>
          </Box>
        </motion.div>
      </Box>

      {/* ── Delete confirmation ── */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => !deleting && setDeleteTarget(null)}>
        <DialogTitle>Delete this trip?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            "{deleteTarget?.title}" and everything planned in it will be removed. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={() => void handleDelete()} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        message={snackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      {shareTrip && (
        <TripShareModal
          open={Boolean(shareTrip)}
          onClose={() => setShareTrip(null)}
          tripId={shareTrip.id}
          tripName={shareTrip.title}
          destinationCount={shareTrip.countries.length}
          totalNights={0}
        />
      )}

      <BookPreviewDialog
        open={Boolean(bookStory)}
        onClose={() => setBookStory(null)}
        story={bookStory}
        token={token}
      />
    </Box>
  );
};

export default Profile;
