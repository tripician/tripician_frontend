/**
 * Search travellers and trips, from your own profile.
 *
 * ## Why it is here at all
 *
 * The identity rail's rule is that actions stay out of it. This is a deliberate
 * exception: the slot above the passport is empty on your own profile, and "who
 * do I travel with next" is a fair thought to have while looking at what you
 * have already done.
 *
 * ## One surface, not a card around a field
 *
 * The input and its results are the same panel, which is why there is no second
 * border around the box. A bordered card wrapping a bordered input reads as two
 * nested rectangles with dead space between them.
 *
 * ## Where the answers come from
 *
 * People come from the server, which matches a name or any destination they
 * have travelled to. Trips are matched here, in memory, over the published list
 * that /community and /trips already filter the same three ways, so one query
 * cannot give two different answers on two pages. Neither that list nor the
 * follow list is fetched until somebody actually types, so a profile view that
 * never searches pays nothing for them.
 */

import React from 'react';
import { Avatar, Box, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { IconSearch, IconMap2, IconCheck, IconUserPlus } from '@tabler/icons-react';
import { apiServices } from '../../services/APIs/apiServices';

/**
 * Hints that rotate while the box is empty.
 *
 * Each is a thing the search can actually find: a traveller by name, a country
 * either kind of result has been to, or a trip by its title. None suggests a
 * home city, which nothing matches on.
 */
const HINTS = [
  'Search travellers and trips',
  'Nepal',
  'Someone who has been to Japan',
  'Slow trips in Portugal',
];

/** Below this a query matches most of the site, so it is not yet a search. */
const MIN_QUERY = 2;

interface ProfileSearchProps {
  /** Enter, or "see all": hands the query to the full directory. */
  onSearch: (query: string) => void;
  onOpenTraveller: (userId: number) => void;
  onOpenTrip: (trip: any) => void;
  /** The signed-in reader, so their own row never offers to follow itself. */
  viewerId?: number;
  token?: string | null;
}

const ProfileSearch: React.FC<ProfileSearchProps> = ({
  onSearch,
  onOpenTraveller,
  onOpenTrip,
  viewerId,
  token,
}) => {
  const theme = useTheme();
  const [q, setQ] = React.useState('');
  const [applied, setApplied] = React.useState('');
  const [people, setPeople] = React.useState<any[] | null>(null);
  const [trips, setTrips] = React.useState<any[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [hint, setHint] = React.useState(0);

  /**
   * Who the reader already follows.
   *
   * Fetched once as a set rather than asked per row. The crew payload carries no
   * follow flag, so the alternative was one is-following request per result on
   * every keystroke, and a button that guessed would show "Follow" to somebody
   * who already does.
   *
   * Null means not loaded yet, which is why the button waits rather than
   * rendering a state it cannot stand behind.
   */
  const [following, setFollowing] = React.useState<Set<number> | null>(null);
  const [busyId, setBusyId] = React.useState<number | null>(null);
  const allTrips = React.useRef<any[] | null>(null);
  const followLoaded = React.useRef(false);

  // Only while there is nothing to read. Rotating text under a typed query, or
  // under results, is movement for its own sake.
  React.useEffect(() => {
    if (q) return;
    const t = setInterval(() => setHint((i) => (i + 1) % HINTS.length), 3000);
    return () => clearInterval(t);
  }, [q]);

  // The same 300ms the crew directory uses: without it every keystroke fires a
  // request, and the people query fans out across every account server-side.
  React.useEffect(() => {
    const t = setTimeout(() => setApplied(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  React.useEffect(() => {
    if (applied.length < MIN_QUERY) {
      setPeople(null);
      setTrips(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    const needle = applied.toLowerCase();

    // Once, on the first real search, and never again this mount.
    if (!followLoaded.current && viewerId) {
      followLoaded.current = true;
      void apiServices
        .getFollowing(viewerId)
        .then((r) => setFollowing(new Set((r.data || []).map((f: any) => f.userId))))
        .catch(() => setFollowing(new Set()));
    }

    const peoplePromise = apiServices
      .getTravelersCrew(undefined, undefined, undefined, false, applied)
      .then((r) => (r.data || []).slice(0, 4))
      .catch(() => []);

    // Fetched once, then filtered in memory on every later keystroke.
    const source = allTrips.current
      ? Promise.resolve(allTrips.current)
      : apiServices
          .getPublishedTrips()
          .then((r) => {
            allTrips.current = Array.isArray(r.data) ? r.data : [];
            return allTrips.current;
          })
          .catch(() => {
            allTrips.current = [];
            return allTrips.current;
          });

    const tripsPromise = source.then((list) =>
      (list || [])
        .filter((t: any) =>
          (t.name || '').toLowerCase().includes(needle)
          || (t.description || '').toLowerCase().includes(needle)
          || (Array.isArray(t.countries)
            && t.countries.some((c: string) => (c || '').toLowerCase().includes(needle))),
        )
        .slice(0, 4),
    );

    void Promise.all([peoplePromise, tripsPromise]).then(([p, t]) => {
      if (!active) return;
      setPeople(p);
      setTrips(t);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [applied, viewerId]);

  /**
   * Optimistic, and put back on failure.
   *
   * A follow that silently did not happen is worse than a slow button: the row
   * would read "Following" while the server disagreed, and the reader would only
   * find out on the next page load.
   */
  const toggleFollow = async (userId: number) => {
    if (!token || busyId === userId || following === null) return;
    const wasFollowing = following.has(userId);

    setBusyId(userId);
    setFollowing((prev) => {
      const next = new Set(prev ?? []);
      if (wasFollowing) next.delete(userId);
      else next.add(userId);
      return next;
    });

    try {
      if (wasFollowing) await apiServices.unfollowUser(token, userId);
      else await apiServices.followUser(token, userId);
    } catch {
      setFollowing((prev) => {
        const next = new Set(prev ?? []);
        if (wasFollowing) next.add(userId);
        else next.delete(userId);
        return next;
      });
      window.dispatchEvent(
        new CustomEvent('app:error', { detail: { message: 'That did not save. Try again.' } }),
      );
    } finally {
      setBusyId(null);
    }
  };

  const open = applied.length >= MIN_QUERY;
  const nothing = open && !loading && people?.length === 0 && trips?.length === 0;

  const rowSx = {
    display: 'flex',
    alignItems: 'center',
    gap: 1.25,
    px: 1.5,
    py: 1,
    transition: 'background-color 120ms ease',
    '&:hover': { bgcolor: theme.custom.surface.hover },
  } as const;

  const groupSx = {
    display: 'block',
    px: 1.5,
    pt: 1.25,
    pb: 0.5,
    fontSize: 10.5,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'text.disabled',
  } as const;

  const noteSx = {
    display: 'block',
    px: 1.5,
    py: 1.25,
    fontSize: 12,
    color: 'text.secondary',
  } as const;

  const keyActivate = (fn: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fn();
    }
  };

  return (
    <Box
      sx={{
        borderRadius: '16px',
        border: `1px solid ${theme.custom.surface.border}`,
        bgcolor: 'background.paper',
        overflow: 'hidden',
        transition: 'border-color 160ms ease, box-shadow 160ms ease',
        '&:focus-within': {
          borderColor: alpha(theme.palette.primary.main, 0.55),
          boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.12)}`,
        },
      }}
    >
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', px: 1.75, height: 46 }}>
        <IconSearch
          size={16}
          stroke={1.9}
          style={{ flexShrink: 0, color: theme.palette.text.disabled }}
          aria-hidden="true"
        />
        <Box
          component="input"
          value={q}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter') onSearch(q.trim());
          }}
          aria-label="Search travellers and trips"
          sx={{
            flex: 1,
            minWidth: 0,
            ml: 1.25,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'inherit',
            fontSize: 13.5,
            color: 'text.primary',
          }}
        />
        {/* The rotating hint is an overlay, not the placeholder attribute, which
            cannot be transitioned. It never intercepts a click. */}
        {!q && (
          <Typography
            key={hint}
            aria-hidden="true"
            noWrap
            sx={{
              position: 'absolute',
              left: 46,
              right: 16,
              fontSize: 13.5,
              color: 'text.disabled',
              pointerEvents: 'none',
              animation: 'profileSearchHint 3000ms ease-in-out',
              '@keyframes profileSearchHint': {
                '0%': { opacity: 0, transform: 'translateY(3px)' },
                '12%': { opacity: 1, transform: 'none' },
                '88%': { opacity: 1, transform: 'none' },
                '100%': { opacity: 0, transform: 'translateY(-3px)' },
              },
            }}
          >
            {HINTS[hint]}
          </Typography>
        )}
      </Box>

      {open && (
        <Box sx={{ borderTop: `1px solid ${theme.custom.surface.border}`, pb: 0.75 }}>
          {loading && people === null ? (
            <Typography sx={noteSx}>Searching...</Typography>
          ) : nothing ? (
            <Typography sx={noteSx}>Nothing yet. Try a country.</Typography>
          ) : (
            <>
              {people && people.length > 0 && (
                <>
                  <Typography component="span" sx={groupSx}>Travellers</Typography>
                  {people.map((t: any) => {
                    const isSelf = viewerId != null && t.userId === viewerId;
                    const isFollowing = following?.has(t.userId) ?? false;
                    // Waits for the follow list rather than guessing a state.
                    const canFollow = !isSelf && !!token && following !== null;
                    // The row is a plain container with two controls side by side,
                    // not a role="button" with a button inside it. A nested control
                    // is invalid ARIA, and it makes the outer element's accessible
                    // name absorb the inner one's, so "Follow Tom" and the row
                    // itself resolve to the same target.
                    return (
                      <Box key={`p${t.userId}`} sx={rowSx}>
                        <Box
                          component="button"
                          type="button"
                          onClick={() => onOpenTraveller(t.userId)}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.25,
                            flex: 1,
                            minWidth: 0,
                            p: 0,
                            border: 'none',
                            background: 'none',
                            textAlign: 'left',
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                          }}
                        >
                          <Avatar src={t.avatar || undefined} sx={{ width: 26, height: 26, fontSize: 11 }}>
                            {(t.name || 'E').charAt(0)}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography noWrap sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>
                              {t.name || 'Explorer'}
                            </Typography>
                            {/* The directory's own wording for nothing published, so
                                one traveller does not read two ways on two pages. */}
                            <Typography noWrap sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                              {t.tripCount > 0 ? `${t.tripCount} trip${t.tripCount !== 1 ? 's' : ''}` : 'New here'}
                            </Typography>
                          </Box>
                        </Box>

                        {canFollow && (
                          <Box
                            component="button"
                            type="button"
                            aria-label={isFollowing ? `Unfollow ${t.name || 'traveller'}` : `Follow ${t.name || 'traveller'}`}
                            disabled={busyId === t.userId}
                            onClick={() => void toggleFollow(t.userId)}
                            sx={{
                              flexShrink: 0,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5,
                              px: 1.1,
                              height: 26,
                              borderRadius: 999,
                              cursor: busyId === t.userId ? 'default' : 'pointer',
                              fontFamily: 'inherit',
                              fontSize: 11.5,
                              fontWeight: 600,
                              opacity: busyId === t.userId ? 0.55 : 1,
                              transition: 'background-color 120ms ease, color 120ms ease, border-color 120ms ease',
                              border: `1px solid ${isFollowing ? theme.custom.surface.border : 'transparent'}`,
                              bgcolor: isFollowing ? 'transparent' : 'primary.main',
                              color: isFollowing ? 'text.secondary' : 'primary.contrastText',
                            }}
                          >
                            {isFollowing ? <IconCheck size={12} stroke={2.4} /> : <IconUserPlus size={12} stroke={2.2} />}
                            {isFollowing ? 'Following' : 'Follow'}
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </>
              )}

              {trips && trips.length > 0 && (
                <>
                  <Typography component="span" sx={groupSx}>Trips</Typography>
                  {trips.map((t: any, i: number) => (
                    <Box
                      key={`t${t.id || i}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => onOpenTrip(t)}
                      onKeyDown={keyActivate(() => onOpenTrip(t))}
                      sx={rowSx}
                    >
                      <Box
                        sx={{
                          width: 26,
                          height: 26,
                          borderRadius: '8px',
                          flexShrink: 0,
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: theme.custom.surface.brandTint,
                          color: 'primary.main',
                        }}
                      >
                        <IconMap2 size={14} stroke={1.9} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography noWrap sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>
                          {t.name || 'Untitled trip'}
                        </Typography>
                        <Typography noWrap sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                          {Array.isArray(t.countries) ? t.countries.filter(Boolean).join(', ') : ''}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </>
              )}

              {/* Only travellers, because that is what /crew holds. Saying "see
                  all results" would promise a page that does not exist. */}
              <Box
                component="button"
                type="button"
                onClick={() => onSearch(applied)}
                sx={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 12,
                  color: 'primary.main',
                  px: 1.5,
                  py: 1,
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                See all travellers in Find crew
              </Box>
            </>
          )}
        </Box>
      )}
    </Box>
  );
};

export default ProfileSearch;
