/**
 * /profile, your own profile.
 *
 * Redesigned in 2026-11 to match the app's profile, so one person's page reads
 * the same on both: a centred title page (cover, photo, name, where you are,
 * your own words, three figures, Edit profile), your travel stamps, then the
 * tabs. The Wall is the portfolio the app shows (Featured, Photobook, Travel
 * Journal). Trips, Stories and Saved are the web's working tabs: the web is
 * where plans are managed, and /dashboard still lands on Trips.
 *
 * This page is auth-gated and TravelerProfile is a separate component, so
 * nothing private here (drafts, saved, archived) is reachable from the public
 * route.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Button, ButtonBase, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, Snackbar,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  IconArchive,
  IconBook,
  IconBookmark,
  IconLayoutGrid,
  IconMapPlus,
  IconPencil,
  IconPlus,
  IconRoute,
  IconShare3,
  IconUsers,
} from '@tabler/icons-react';
import type { AppDispatch, RootState } from '../../store';
import { fetchUserProfile } from '../../store/userSlice';
import { apiServices } from '../../services/APIs/apiServices';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { useAppShell } from '../PageLayout/AppShellContext';
import { fetchUnsplashImage } from '../../services/unsplashService';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import FilterChip from '../../components/ui/FilterChip';
import { CardGridSkeleton } from '../../components/ui/Skeletons';
import TripCard from '../DashboardPage/TripCard';
import TripShareModal from '../../components/TripShareModal';
import Seo from '../../components/Seo';
import StoryCard from '../../afterstory/cards/StoryCard';
import { afterStoryService } from '../../afterstory/afterStoryService';
import type { AfterStorySummaryDto } from '../../afterstory/types';
import { FEATURE_FLAGS } from '../../config/featureFlags';
import { tripPath } from '../../utils/tripSlug';
import JoinRequestsInbox from '../../seats/JoinRequestsInbox';
import { mapTripVM, rowsFrom, type TripVM } from './tripViewModel';
import { readHighlights, readIntro } from './profileBio';
import CredibilityStrip from './CredibilityStrip';
import { resolveTab, type TabId } from './profileTabs';
import type { TravelMap } from './travelHistory';
import ProfileHeader, { type ProfileStat } from './portfolio/ProfileHeader';
import { profileSocials } from './portfolio/socials';
import ProfilePortfolio from './portfolio/ProfilePortfolio';
import ProfileTabStrip, { type ProfileTab } from './portfolio/ProfileTabStrip';
import { SectionHeader } from './portfolio/PortfolioSection';
import TravelStamps from './portfolio/TravelStamps';
import FollowListDialog, { type FollowMode } from './portfolio/FollowListDialog';

/** The one figure read from /api/trips/vibe-passport: your own country count. */
interface PassportSummary {
  countriesVisited: number;
}

/** The app clamps a tablet's profile to this; the web uses the same measure. */
const CONTENT_MAX = 1040;

type TripFilter = 'all' | 'mine' | 'shared' | 'published' | 'archived';

const TRIP_FILTERS: { id: TripFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'Mine' },
  { id: 'shared', label: 'Shared with me' },
  { id: 'published', label: 'Published' },
  { id: 'archived', label: 'Archived' },
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

/** Shares a link: the system sheet where there is one, else the clipboard. */
async function shareLink(url: string, title: string) {
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share({ title, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    window.dispatchEvent(new CustomEvent('app:success', { detail: { message: 'Profile link copied' } }));
  } catch {
    /* closed the sheet, or the clipboard was refused */
  }
}

const tripGridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' },
  gap: 3,
} as const;

const Profile: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { token } = useAuthToken();
  const { openCreateTrip } = useAppShell();
  const [searchParams, setSearchParams] = useSearchParams();

  const { profile, loading, error } = useSelector((state: RootState) => state.user);

  const requested = resolveTab(searchParams.get('tab'));
  const activeTab = requested.tab;
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
  // An old `?tab=archived` link lands on Trips with Archived chosen.
  const [tripFilter, setTripFilter] = useState<TripFilter>(requested.archived ? 'archived' : 'all');

  const [savedTrips, setSavedTrips] = useState<TripVM[]>([]);
  const [likedTrips, setLikedTrips] = useState<TripVM[]>([]);
  const [savedStories, setSavedStories] = useState<AfterStorySummaryDto[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const savedFetched = useRef(false);

  // Every story you wrote: the Stories tab lists them all, the journal only the published ones.
  const [myStories, setMyStories] = useState<AfterStorySummaryDto[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(true);

  const [followStats, setFollowStats] = useState<{ followers: number; following: number } | null>(null);
  const [followList, setFollowList] = useState<FollowMode | null>(null);
  // `undefined` while loading, `null` if it failed: either way the figure is not a zero.
  const [vibePassport, setVibePassport] = useState<PassportSummary | null | undefined>(undefined);
  const [travelMap, setTravelMap] = useState<TravelMap | null>(null);

  const [defaultBanner, setDefaultBanner] = useState<string | null>(null);
  const [coverFailed, setCoverFailed] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<TripVM | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [shareTrip, setShareTrip] = useState<TripVM | null>(null);

  const userId = Number.isFinite(Number(profile?.id)) && Number(profile?.id) > 0 ? Number(profile?.id) : null;

  useEffect(() => {
    dispatch(fetchUserProfile());
  }, [dispatch]);

  // Cover fallback: scenery for the user's location. No location, no fetch: the band stays a quiet wash.
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

  useEffect(() => {
    if (!token) return;
    let active = true;
    void apiServices
      .getVibePassport(token)
      .then((resp) => { if (active) setVibePassport(resp.data ?? null); })
      .catch(() => { if (active) setVibePassport(null); });
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    if (userId == null) return;
    let wanted = userId;
    void apiServices.getFollowStats(userId)
      .then((resp) => { if (wanted === userId) setFollowStats(resp.data); })
      .catch(() => { if (wanted === userId) setFollowStats({ followers: 0, following: 0 }); });
    void apiServices.getTravelMap(userId)
      .then((resp) => { if (wanted === userId) setTravelMap(resp.data); })
      .catch(() => { if (wanted === userId) setTravelMap({ countries: [], legs: [] }); });
    return () => { wanted = -1; };
  }, [userId]);

  // The one trips fetch, shared by the journal and the Trips tab.
  useEffect(() => {
    if (!token) return;
    let active = true;
    setTripsLoading(true);
    void apiServices
      .getDashboardTrips(token)
      .then((resp) => { if (active) setAllTrips(rowsFrom(resp?.data).map((t) => mapTripVM(t, profile))); })
      .catch(() => { if (active) setAllTrips([]); })
      .finally(() => { if (active) setTripsLoading(false); });
    return () => { active = false; };
  }, [token, profile]);

  useEffect(() => {
    if (!FEATURE_FLAGS.afterStory || !token) {
      setStoriesLoading(false);
      return;
    }
    let active = true;
    void afterStoryService
      .listMine()
      .then((rows) => { if (active) setMyStories(rows); })
      .catch(() => { if (active) setMyStories([]); })
      .finally(() => { if (active) setStoriesLoading(false); });
    return () => { active = false; };
  }, [token]);

  // Saved loads on first visit to its tab.
  useEffect(() => {
    if (activeTab !== 'saved' || savedFetched.current || !token) return;
    savedFetched.current = true;
    setSavedLoading(true);
    void Promise.allSettled([
      apiServices.getSavedTrips(token),
      apiServices.getLikedTrips(token),
      FEATURE_FLAGS.afterStory ? afterStoryService.listSaved() : Promise.resolve([]),
    ]).then(([saved, liked, stories]) => {
      if (saved.status === 'fulfilled') setSavedTrips(rowsFrom(saved.value?.data).map((t) => mapTripVM(t, profile)));
      if (liked.status === 'fulfilled') setLikedTrips(rowsFrom(liked.value?.data).map((t) => mapTripVM(t, profile)));
      if (stories.status === 'fulfilled') setSavedStories(stories.value as AfterStorySummaryDto[]);
      setSavedLoading(false);
    });
  }, [activeTab, token, profile]);

  // ── derived ──────────────────────────────────────────────────────────────

  const activeTrips = useMemo(() => allTrips.filter((t) => !t.isArchived), [allTrips]);
  const archivedTrips = useMemo(() => allTrips.filter((t) => t.isArchived), [allTrips]);
  const publishedStories = useMemo(() => myStories.filter((s) => s.status === 'Published'), [myStories]);

  const filteredTrips = useMemo(() => {
    switch (tripFilter) {
      case 'mine': return activeTrips.filter((t) => t.isOwner);
      case 'shared': return activeTrips.filter((t) => !t.isOwner);
      case 'published': return activeTrips.filter((t) => t.isPublished);
      case 'archived': return archivedTrips;
      default: return activeTrips;
    }
  }, [tripFilter, activeTrips, archivedTrips]);

  const openTrip = useCallback(
    (t: TripVM) => { if (t.id) navigate(tripPath({ id: t.id, name: t.title }), { state: { trip: t } }); },
    [navigate],
  );

  const writeStory = useCallback(() => window.dispatchEvent(new Event('story:create')), []);

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

  // Finishing is the moment the story is fresh, so it goes straight to writing it.
  const finishTrip = async (t: TripVM) => {
    if (!token || !window.confirm(`Mark "${t.title}" as finished? Everyone on it will be asked to write the story.`)) return;
    try {
      await apiServices.setTripStatus(token, t.id, 2);
      setAllTrips((prev) => prev.map((x) => (x.id === t.id ? { ...x, tripStatus: 2 } : x)));
      navigate(`/tripplanner/${t.id}?tab=story`);
    } catch {
      setSnackbar('Could not finish that trip.');
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

  if (loading && !profile) {
    return (
      <Box sx={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (error && !profile) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ErrorState title="Couldn't load your profile" description={error} onRetry={() => dispatch(fetchUserProfile({ force: true }))} />
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
  const coverSrc = (!coverFailed && profile.coverpicture) || defaultBanner;
  const intro = readIntro(profile);

  const socials = profileSocials(profile);

  // Countries come from the passport: the one place your own count is answered.
  const countries = vibePassport === undefined ? null : vibePassport ? vibePassport.countriesVisited : '—';
  const stats: ProfileStat[] = [
    { value: countries, label: vibePassport?.countriesVisited === 1 ? 'Country' : 'Countries', brand: true },
    { value: followStats?.followers ?? null, label: 'Followers', onClick: () => setFollowList('followers') },
    { value: followStats?.following ?? null, label: 'Following', onClick: () => setFollowList('following') },
  ];

  const savedCount = savedTrips.length + likedTrips.length + savedStories.length;
  const tabs: ProfileTab<TabId>[] = [
    { id: 'wall', label: 'Wall', Icon: IconLayoutGrid },
    { id: 'trips', label: 'Trips', Icon: IconRoute, count: activeTrips.length || null },
    ...(FEATURE_FLAGS.afterStory ? [{ id: 'stories' as const, label: 'Stories', Icon: IconBook, count: myStories.length || null }] : []),
    { id: 'saved', label: 'Saved', Icon: IconBookmark, count: savedCount || null },
  ];

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
          onShare={(e) => { e.stopPropagation(); setShareTrip(t); }}
          {...(t.isOwner ? { onDelete: (e: React.MouseEvent) => { e.stopPropagation(); setDeleteTarget(t); } } : {})}
          {...(t.isOwner && t.tripStatus === 0 ? { onGoLive: () => void goLive(t) } : {})}
          {...(t.isOwner && t.tripStatus === 1 ? { onFinish: () => void finishTrip(t) } : {})}
        />
      ))}
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Private page: never indexed. */}
      <Seo title={fullName} description="Your trips, stories, saved itineraries and travel passport." path="/profile" noindex />

      <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 0, sm: 3, md: 4 }, pb: 12 }}>
        <Box sx={{ maxWidth: CONTENT_MAX, mx: 'auto' }}>
          <ProfileHeader
            name={fullName}
            avatarUrl={profile.profilepicture}
            coverUrl={coverSrc}
            onCoverError={() => {
              // A broken cover tries the scenery fallback; if that fails too, the band stays a wash.
              if (!coverFailed && profile.coverpicture) setCoverFailed(true);
              else setDefaultBanner(null);
            }}
            verified={!!profile.identityVerifiedAt}
            verifiedAt={profile.identityVerifiedAt}
            location={profile.location}
            intro={intro}
            highlights={readHighlights(profile)}
            introPrompt={
              <ButtonBase
                onClick={() => navigate('/settings')}
                sx={(theme) => ({
                  fontFamily: 'inherit',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: theme.palette.mode === 'light' ? theme.custom.brand.onLight : theme.custom.brand.onDark,
                  gap: 0.5,
                  px: 1.25,
                  py: 0.5,
                  borderRadius: 999,
                  '&:hover': { bgcolor: theme.custom.surface.brandTint },
                })}
              >
                <IconPlus size={15} /> Add a short intro
              </ButtonBase>
            }
            socials={socials}
            stats={stats}
            actions={
              <>
                <Button variant="outlined" startIcon={<IconPencil size={16} />} onClick={() => navigate('/settings')}>
                  Edit profile
                </Button>
                {userId != null ? (
                  <Button
                    variant="outlined"
                    startIcon={<IconShare3 size={16} />}
                    onClick={() => void shareLink(`${window.location.origin}/traveler/${userId}`, fullName)}
                  >
                    Share profile
                  </Button>
                ) : null}
              </>
            }
            footnote={userId != null ? <CredibilityStrip userId={userId} variant="plain" /> : null}
          />

          {travelMap ? (
            <Box sx={{ mt: { xs: 4, md: 5 } }}>
              <TravelStamps
                countries={travelMap.countries}
                locationCountries={travelMap.locationCountries}
                homeCountry={profile.country}
                onAddHome={() => navigate('/settings')}
              />
            </Box>
          ) : null}

          {/* Somebody is waiting on an answer, which outranks browsing your own trips. Nothing when empty. */}
          <JoinRequestsInbox />

          <Box sx={{ mt: { xs: 4, md: 5 } }}>
            <ProfileTabStrip tabs={tabs} value={activeTab} onChange={setActiveTab} />
          </Box>

          <Box role="tabpanel" sx={{ pt: { xs: 4, md: 5 } }}>
            {activeTab === 'wall' && (
              <ProfilePortfolio
                userId={userId}
                isOwner
                name={fullName}
                trips={activeTrips}
                stories={publishedStories}
                sourcesLoading={tripsLoading || storiesLoading}
                onCreatePlan={() => openCreateTrip()}
                onWriteStory={FEATURE_FLAGS.afterStory ? writeStory : undefined}
              />
            )}

            {activeTab === 'trips' && (
              <>
                <SectionHeader
                  title="Your trips"
                  description="Plans you are making, have taken, or were invited onto"
                  accessory={<Button variant="contained" size="small" startIcon={<IconPlus size={16} />} onClick={() => openCreateTrip()}>Plan a trip</Button>}
                />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                  {TRIP_FILTERS.map((f) => (
                    <FilterChip
                      key={f.id}
                      label={f.label}
                      Icon={f.id === 'archived' ? IconArchive : undefined}
                      active={tripFilter === f.id}
                      onClick={() => setTripFilter(f.id)}
                    />
                  ))}
                </Box>
                {tripsLoading ? (
                  <CardGridSkeleton count={3} minWidth={260} />
                ) : filteredTrips.length === 0 ? (
                  <EmptyState
                    icon={tripFilter === 'archived' ? IconArchive : IconMapPlus}
                    title={tripFilter === 'all' ? 'No trips yet' : 'Nothing here'}
                    description={
                      tripFilter === 'shared' ? 'When someone adds you to their trip, it will show up here.'
                        : tripFilter === 'published' ? 'Publish a trip and it becomes the first thing travellers see on your profile.'
                          : tripFilter === 'archived' ? 'Trips you archive are kept here, out of the way but never deleted.'
                            : 'Plan your first trip and it will live here.'
                    }
                    {...(tripFilter === 'all' || tripFilter === 'mine'
                      ? { actionLabel: 'Plan a trip', onAction: () => openCreateTrip() }
                      : tripFilter === 'archived' ? {} : { actionLabel: 'Browse trips', onAction: () => navigate('/stories?kind=plans') })}
                  />
                ) : (
                  renderTripGrid(filteredTrips)
                )}
              </>
            )}

            {activeTab === 'stories' && FEATURE_FLAGS.afterStory && (
              <>
                <SectionHeader
                  title="Your stories"
                  description="Drafts and published Afterstories"
                  accessory={<Button variant="contained" size="small" startIcon={<IconPencil size={16} />} onClick={writeStory}>Write a story</Button>}
                />
                {storiesLoading ? (
                  <CardGridSkeleton count={3} minWidth={260} />
                ) : myStories.length === 0 ? (
                  <EmptyState
                    icon={IconBook}
                    title="No stories yet"
                    description="Write up a trip you took. If you planned it here, the shape of it is already done for you."
                    actionLabel="Write a story"
                    onAction={writeStory}
                  />
                ) : (
                  <Box sx={tripGridSx}>
                    {myStories.map((s) => <StoryCard key={s.id} story={s} />)}
                  </Box>
                )}
              </>
            )}

            {activeTab === 'saved' && (
              <>
                {savedLoading ? (
                  <CardGridSkeleton count={3} minWidth={260} />
                ) : savedTrips.length === 0 && likedTrips.length === 0 && savedStories.length === 0 ? (
                  <EmptyState
                    icon={IconBookmark}
                    title="Nothing saved yet"
                    description="Save a trip or a story from Groups & Stories and it will wait for you here."
                    actionLabel="Open Groups & Stories"
                    onAction={() => navigate('/stories')}
                  />
                ) : (
                  <Box sx={{ display: 'grid', gap: 6 }}>
                    {savedTrips.length > 0 && (
                      <Box>
                        <SectionHeader title="Saved trips" description="Itineraries you bookmarked" />
                        {renderTripGrid(savedTrips)}
                      </Box>
                    )}
                    {likedTrips.length > 0 && (
                      <Box>
                        <SectionHeader title="Liked trips" description="Plans you liked along the way" />
                        {renderTripGrid(likedTrips)}
                      </Box>
                    )}
                    {savedStories.length > 0 && (
                      <Box>
                        <SectionHeader title="Saved stories" description="Your reading list" />
                        <Box sx={tripGridSx}>
                          {savedStories.map((s) => <StoryCard key={s.id} story={s} />)}
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}
              </>
            )}
          </Box>
        </Box>
      </Box>

      {userId != null ? (
        <FollowListDialog userId={userId} mode={followList} onClose={() => setFollowList(null)} viewerId={userId} />
      ) : null}

      <Dialog open={Boolean(deleteTarget)} onClose={() => !deleting && setDeleteTarget(null)}>
        <DialogTitle>Delete this trip?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            "{deleteTarget?.title}" and everything planned in it will be removed. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
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

    </Box>
  );
};

export default Profile;
