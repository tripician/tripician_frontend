import React from 'react';
import { Box, Button, IconButton, Menu, MenuItem, Typography } from '@mui/material';
import { useParams, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { IconBan, IconCheck, IconDots, IconUserPlus } from '@tabler/icons-react';
import { useRequireAuth } from '../../auth/AuthGate';
import { confirmAndBlock } from '../../utils/blocking';
import type { RootState } from '../../store';
import { apiServices } from '../../services/APIs/apiServices';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { countryNameFromCode } from '../../utils/countryFlags';
import Seo from '../../components/Seo';
import ErrorState from '../../components/ui/ErrorState';
import { FEATURE_FLAGS } from '../../config/featureFlags';
import { afterStoryService } from '../../afterstory/afterStoryService';
import type { AfterStorySummaryDto } from '../../afterstory/types';
import type { OrganiserRecord } from '../../seats/types';
import CredibilityStrip from './CredibilityStrip';
import { readHighlights, readIntro } from './profileBio';
import { mapTripVM, rowsFrom, type TripVM } from './tripViewModel';
import type { TravelMap } from './travelHistory';
import ProfileHeader, { type ProfileStat } from './portfolio/ProfileHeader';
import { profileSocials } from './portfolio/socials';
import ProfilePortfolio from './portfolio/ProfilePortfolio';
import TravelStamps from './portfolio/TravelStamps';
import FollowListDialog, { type FollowMode } from './portfolio/FollowListDialog';
import MessageButton from '../../messages/MessageButton';

/** The same measure as /profile and the app on a tablet. */
const CONTENT_MAX = 1040;

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
  profileVerifiedAt?: string | null;
}

/** Whether this person is on a trip's crew, by any of the member shapes the trips endpoints send. */
function hasMember(raw: any, userId: number): boolean {
  const members: any[] = raw?.members || raw?.invitedUsers || [];
  return members.some((m) => String(m?.userId ?? m?.UserId ?? m?.id ?? m?.user?.id ?? '') === String(userId));
}

/**
 * Someone else's profile, the same page the app shows: the title page (cover,
 * photo, name, where they are, how long they have been here, their own words,
 * three figures, Follow), what backs them up, their travel stamps, then their
 * portfolio: Featured, Photobook and the Travel Journal.
 */
const TravelerProfile: React.FC = () => {
  const requireAuth = useRequireAuth();
  const { userId: userIdParam } = useParams<{ userId: string }>();
  const userId = Number(userIdParam);
  const { token } = useAuthToken();
  const myProfile = useSelector((state: RootState) => state.user.profile);

  const [user, setUser] = React.useState<PublicUser | null>(null);
  const [userLoading, setUserLoading] = React.useState(true);
  const [userError, setUserError] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);

  const [stats, setStats] = React.useState<{ followers: number; following: number } | null>(null);
  const [followList, setFollowList] = React.useState<FollowMode | null>(null);
  const [trips, setTrips] = React.useState<TripVM[]>([]);
  const [tripsLoading, setTripsLoading] = React.useState(true);
  const [stories, setStories] = React.useState<AfterStorySummaryDto[]>([]);
  const [storiesLoading, setStoriesLoading] = React.useState(true);
  const [travelMap, setTravelMap] = React.useState<TravelMap | null>(null);
  const [record, setRecord] = React.useState<OrganiserRecord | null>(null);
  const [coverFailed, setCoverFailed] = React.useState(false);

  const [isFollowing, setIsFollowing] = React.useState(false);
  const [followBusy, setFollowBusy] = React.useState(false);
  const [blocked, setBlocked] = React.useState(false);
  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);

  // Public identity and follow counts.
  React.useEffect(() => {
    if (!Number.isFinite(userId)) return;
    let active = true;
    setUserLoading(true);
    setUserError(false);
    setCoverFailed(false);
    apiServices.getUserById(userId)
      .then((resp) => { if (active) setUser(resp.data); })
      .catch(() => { if (active) setUserError(true); })
      .finally(() => { if (active) setUserLoading(false); });
    apiServices.getFollowStats(userId)
      .then((resp) => { if (active) setStats(resp.data); })
      .catch(() => { if (active) setStats({ followers: 0, following: 0 }); });
    return () => { active = false; };
  }, [userId, reloadKey]);

  // Their published plans and the ones they were crew on: the journal's plans.
  React.useEffect(() => {
    if (!Number.isFinite(userId)) return;
    let active = true;
    setTripsLoading(true);
    apiServices.getPublishedTrips(token ?? undefined)
      .then((resp) => {
        if (!active) return;
        const rows = rowsFrom(resp?.data);
        const theirs = rows.filter((t: any) => String(t.ownerUserId ?? t.owner?.id ?? '') === String(userId) || hasMember(t, userId));
        setTrips(theirs.map((t: any) => mapTripVM(t, myProfile)));
      })
      .catch(() => { if (active) setTrips([]); })
      .finally(() => { if (active) setTripsLoading(false); });
    return () => { active = false; };
  }, [userId, token, reloadKey, myProfile]);

  // Their published stories. listByAuthor swallows its own failures, so an outage cannot take the page down.
  React.useEffect(() => {
    if (!FEATURE_FLAGS.afterStory || !Number.isFinite(userId)) {
      setStoriesLoading(false);
      return;
    }
    let active = true;
    setStoriesLoading(true);
    void afterStoryService.listByAuthor(userId, 50)
      .then((items) => { if (active) setStories(items.filter((s) => !s.status || s.status === 'Published')); })
      .finally(() => { if (active) setStoriesLoading(false); });
    return () => { active = false; };
  }, [userId]);

  React.useEffect(() => {
    if (!Number.isFinite(userId)) return;
    let wanted = userId;
    void apiServices.getTravelMap(userId)
      .then((resp) => { if (wanted === userId) setTravelMap(resp.data); })
      .catch(() => { if (wanted === userId) setTravelMap({ countries: [], legs: [] }); });
    // The published-only track record: the country count a stranger is shown, for a verified person only.
    void apiServices.getOrganiserRecord(userId)
      .then((r) => { if (wanted === userId) setRecord(r.data); })
      .catch(() => { if (wanted === userId) setRecord(null); });
    return () => { wanted = -1; };
  }, [userId]);

  React.useEffect(() => {
    if (!token || !Number.isFinite(userId)) return;
    let active = true;
    apiServices.isFollowing(token, userId)
      .then((resp) => { if (active) setIsFollowing(!!resp.data?.isFollowing); })
      .catch(() => { /* default to not following */ });
    return () => { active = false; };
  }, [token, userId]);

  // Whether the reader blocked this person. Their own list, so only asked when signed in.
  React.useEffect(() => {
    if (!token || !Number.isFinite(userId)) { setBlocked(false); return; }
    let active = true;
    apiServices.getBlocks()
      .then((r) => { if (active) setBlocked((r.data ?? []).some((b) => b.userId === userId)); })
      .catch(() => { if (active) setBlocked(false); });
    return () => { active = false; };
  }, [token, userId]);

  // Viewing yourself: your own profile has the full experience.
  if (myProfile?.id && String(myProfile.id) === String(userId)) {
    return <Navigate to="/profile" replace />;
  }
  if (!Number.isFinite(userId)) {
    return <Navigate to="/error/404" replace />;
  }

  const block = async () => {
    setMenuAnchor(null);
    if (!requireAuth({ reason: 'Sign in to block people you do not want to hear from.' })) return;
    try {
      if (await confirmAndBlock(userId, user?.name)) {
        setBlocked(true);
        setIsFollowing(false);
      }
    } catch {
      window.dispatchEvent(new CustomEvent('app:error', { detail: { message: 'That person could not be blocked. Try again.' } }));
    }
  };

  const unblock = async () => {
    setMenuAnchor(null);
    try {
      await apiServices.unblockUser(userId);
      setBlocked(false);
    } catch {
      window.dispatchEvent(new CustomEvent('app:error', { detail: { message: 'That did not save. Try again.' } }));
    }
  };

  // Flips at once; a failed write puts both the button and the count back.
  const toggleFollow = async () => {
    if (!requireAuth({ reason: 'Follow a traveller to see their trips and stories as they publish.' }) || !token) return;
    if (followBusy) return;
    setFollowBusy(true);
    const next = !isFollowing;
    setIsFollowing(next);
    setStats((s) => (s ? { ...s, followers: Math.max(0, s.followers + (next ? 1 : -1)) } : s));
    try {
      if (next) await apiServices.followUser(token, userId);
      else await apiServices.unfollowUser(token, userId);
    } catch {
      setIsFollowing(!next);
      setStats((s) => (s ? { ...s, followers: Math.max(0, s.followers + (next ? -1 : 1)) } : s));
      window.dispatchEvent(new CustomEvent('app:error', { detail: { message: 'Could not update follow. Please try again.' } }));
    } finally {
      setFollowBusy(false);
    }
  };

  const name = user?.name || 'Traveller';
  const firstName = user?.name?.split(' ')[0] || 'this person';

  const socials = profileSocials(user);

  // Current Location already reads "City, Country", so the account country is
  // added only when it says something new. It may be an ISO code, so it is
  // compared, and shown, as a name.
  const countryName = user?.country ? (countryNameFromCode(user.country) ?? user.country) : '';
  const location = user
    ? [user.location, user.location?.toLowerCase().includes(countryName.toLowerCase()) ? '' : countryName].filter(Boolean).join(', ')
    : '';

  // How long someone has been here is part of deciding whether to travel with
  // them, and the one fact on this page they cannot edit.
  const joined = user?.joinedAt ? new Date(user.joinedAt) : null;
  const joinedLine = joined && !Number.isNaN(joined.getTime())
    ? `Travelling with Tripician since ${joined.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`
    : '';

  // The country count is a claim, shown only for someone whose identity has been
  // checked, and from the published-only track record.
  const countryCount = user?.identityVerifiedAt && record ? record.countriesVisited : null;
  const statItems: ProfileStat[] = [
    ...(countryCount !== null ? [{ value: countryCount, label: countryCount === 1 ? 'Country' : 'Countries', brand: true }] : []),
    { value: stats?.followers ?? null, label: 'Followers', onClick: () => setFollowList('followers') },
    { value: stats?.following ?? null, label: 'Following', onClick: () => setFollowList('following') },
  ];

  const actions = blocked ? (
    <Button variant="outlined" onClick={() => void unblock()} startIcon={<IconBan size={16} />}>
      Unblock
    </Button>
  ) : (
    <>
      <Button
        onClick={() => void toggleFollow()}
        disabled={followBusy}
        variant={isFollowing ? 'outlined' : 'contained'}
        startIcon={isFollowing ? <IconCheck size={16} /> : <IconUserPlus size={16} />}
      >
        {isFollowing ? 'Following' : 'Follow'}
      </Button>
      {/* Their chat, or a new one (a message request when they don't know you). */}
      {token && <MessageButton userId={userId} name={user?.name ?? null} avatarUrl={user?.avatar ?? null} size="medium" />}
      <IconButton
        aria-label="More options"
        onClick={(e) => setMenuAnchor(e.currentTarget)}
        sx={(theme) => ({ width: 40, height: 40, border: `1px solid ${theme.custom.surface.border}`, color: 'text.secondary', '&:hover': { color: 'text.primary' } })}
      >
        <IconDots size={18} />
      </IconButton>
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => void block()} sx={{ color: 'error.main' }}>
          <IconBan size={15} style={{ marginRight: 10 }} />
          Block {firstName}
        </MenuItem>
      </Menu>
    </>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Seo
        title={user ? `${user.name} - Traveler` : 'Traveler profile'}
        description={user ? `Published trips and travel activity from ${user.name} on Tripician.` : 'Traveler profile on Tripician.'}
        path={`/traveler/${userId}`}
        noindex
      />

      <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 0, sm: 3, md: 4 }, pb: 12 }}>
        <Box sx={{ maxWidth: CONTENT_MAX, mx: 'auto' }}>
          {userError ? (
            <Box sx={{ pt: 6 }}>
              <ErrorState
                title="Traveler not found"
                description="This profile may have been removed, or the link is broken."
                onRetry={() => setReloadKey((k) => k + 1)}
              />
            </Box>
          ) : (
            <>
              <ProfileHeader
                loading={userLoading}
                name={name}
                avatarUrl={user?.avatar}
                coverUrl={!coverFailed ? user?.cover : null}
                onCoverError={() => setCoverFailed(true)}
                verified={!!user?.identityVerifiedAt}
                verifiedAt={user?.identityVerifiedAt}
                location={location}
                joinedLine={joinedLine}
                intro={user ? readIntro(user) : null}
                highlights={user ? readHighlights(user) : []}
                socials={socials}
                stats={statItems}
                actions={userLoading ? null : actions}
                footnote={blocked ? null : <CredibilityStrip userId={userId} variant="plain" />}
              />

              {blocked ? (
                <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mt: 4 }}>
                  You blocked this account. Their trips, comments and messages are hidden.
                </Typography>
              ) : (
                <>
                  {travelMap ? (
                    <Box sx={{ mt: { xs: 4, md: 5 } }}>
                      <TravelStamps countries={travelMap.countries} locationCountries={travelMap.locationCountries} homeCountry={user?.country} />
                    </Box>
                  ) : null}

                  {/* No tabs on someone else's profile, as in the app: a hairline, then their work. */}
                  <Box sx={(theme) => ({ height: '1px', bgcolor: theme.custom.surface.border, mt: { xs: 4, md: 5 }, mb: { xs: 4, md: 5 } })} />

                  <ProfilePortfolio
                    userId={userId}
                    isOwner={false}
                    name={user?.name ?? null}
                    trips={trips}
                    stories={stories}
                    sourcesLoading={tripsLoading || storiesLoading}
                  />
                </>
              )}
            </>
          )}
        </Box>
      </Box>

      <FollowListDialog
        userId={userId}
        mode={followList}
        onClose={() => setFollowList(null)}
        viewerId={myProfile?.id != null ? Number(myProfile.id) : null}
      />
    </Box>
  );
};

export default TravelerProfile;
