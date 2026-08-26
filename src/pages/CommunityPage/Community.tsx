/**
 * /community - one editorial scroll, itineraries and stories together.
 *
 * ## What the page is for
 *
 * The product's answer to "why open this when I am not planning a trip" is what
 * happened AFTER one. So a story leads the page, the trips still looking for
 * someone sit above the catalogue, and the catalogue itself holds both kinds.
 *
 * ## The feed is mixed, and that is the point
 *
 * Stories used to live in a hero above the toolbar and a rail below the grid.
 * They were on the page, but the page's MECHANICS were trips-only: filtering to
 * Culture returned culture trips and never the culture story, and searching
 * Kyoto could not find the Kyoto story sitting two screens down the same page.
 *
 * Now one grid holds both, filtered by the same chips and searched by the same
 * box. The vibe ids are shared between `Trips.Vibe` and a story's `vibe`, so one
 * chip legitimately filters both. Trips keep their ranked order exactly - the
 * Verified tier is a product rule - and stories are spread through them at a
 * derived interval, so one lands in the first row whatever the ratio.
 *
 * The two cards are deliberately different shapes: a trip is landscape, bordered
 * and white-bodied, a story is 4:5, borderless, with its type on the photograph.
 * That silhouette is what makes the mix legible without a badge explaining it,
 * which is why the grid uses `alignItems: start` - stretching would pad the
 * shorter card and throw the distinction away.
 *
 * ## Two curated tiers, both granted by hand
 *
 * Tripician Verified leads the trips, and Editor's choice leads the stories.
 * Neither is computed. Verified says a PLAN is sound enough to copy; Editor's
 * choice says a piece of WRITING is worth someone's time. Both are granted from
 * the admin desk and audited, and both render nothing at all when nobody has
 * granted them - a fallback to "most read" or a daily rotation would put the
 * label's meaning straight back where it started.
 *
 * The Verified slot replaced "Trip of the day", which was `trips[today % length]`:
 * a rotation, not a recommendation. Nobody chose it, so presenting it as the one
 * to look at was a claim the page could not back.
 *
 * ## Nothing may appear twice
 *
 * There are three story surfaces (hero, Editor's choice, feed) and two trip
 * surfaces (the Verified split, the feed), so every one of them subtracts from
 * the next: Editor's choice takes its stories first, the hero fills from what is
 * left, and the feed takes the remainder. The lead verified trip is likewise cut
 * from the feed, where the Verified tier would otherwise rank it into the very
 * next card.
 *
 * All of that unwinds under a filter, because the curated modules hide then, and
 * a card that is invisible AND excluded is a card search cannot reach.
 *
 * ## Corrections worth keeping
 *
 * The story hero was once cut for duplicating the stories rail. The rail was the
 * duplicate, not the hero; the rail is now gone and the hero stays.
 *
 * The hero is gated on `isFiltering`, or searching Kyoto leaves an unrelated
 * Lisbon story above the results. Because it hides, `feedStories` stops
 * excluding the hero's three while a filter is on - otherwise those three became
 * unreachable, and searching for one of them found nothing.
 *
 * Four modules stay cut, on the test that this page should not be a directory of
 * other pages: the travellers strip (Crew is a nav item), the travel-guides rail
 * (static blog JSON), and the templates rail (/templates is its own route).
 */

import React from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { IconCompass, IconFeather } from '@tabler/icons-react';
import CommunityTripCard from './CommunityTripCard';
import FeatureTripCard from './FeatureTripCard';
import { CATEGORIES, CONTENT_MAX, gridSx } from './communityConstants';
import FilterChip from '../../components/ui/FilterChip';
import SearchField from '../../components/ui/SearchField';
import SectionHeader from '../../components/ui/SectionHeader';
import SeeAllLink from '../../components/ui/SeeAllLink';
import ScrollRail from '../../components/ui/ScrollRail';
import ActivityFeed from './ActivityFeed';
import PostComposer from '../../posts/PostComposer';
import PostCard from '../../posts/PostCard';
import { postsService } from '../../posts/postsService';
import type { TravelerPost } from '../../posts/types';
import { usePublishedTrips } from './usePublishedTrips';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { CardGridSkeleton } from '../../components/ui/Skeletons';
import PageHeader from '../../components/ui/PageHeader';
import ChipRail from '../../components/ui/ChipRail';
import Seo from '../../components/Seo';
import QuickPlanCard from '../../navia/QuickPlanCard';
import StoryCard from '../../afterstory/cards/StoryCard';
import StoryStrip from '../../afterstory/cards/StoryStrip';
import { afterStoryService } from '../../afterstory/afterStoryService';
import type { AfterStorySummaryDto } from '../../afterstory/types';
import { useAuthToken } from '../../hooks/useAuth0Token';

import { compareTripsForFeed } from '../../utils/tripRanking';
import { tripPath } from '../../utils/tripSlug';
import { FEATURE_FLAGS } from '../../config/featureFlags';
import { staggerContainer, staggerItem } from '../../utils/animations';

/**
 * "3 trips and 2 stories", or just the half that exists.
 *
 * The old subtitle counted trips only. Now that both kinds share the grid, a
 * search matching two stories and no trips would have read "0 trips" above a
 * grid containing two cards.
 */
function describeFeed(trips: number, stories: number): string {
  const parts: string[] = [];
  if (trips > 0) parts.push(`${trips} ${trips === 1 ? 'trip' : 'trips'}`);
  if (stories > 0) parts.push(`${stories} ${stories === 1 ? 'story' : 'stories'}`);
  return parts.length === 0 ? 'Nothing found' : parts.join(' and ');
}

const Community: React.FC = () => {
  const theme = useTheme();
  const { token } = useAuthToken();
  const navigate = useNavigate();

  const { trips, loading, error, reload } = usePublishedTrips();
  const [activeCategory, setActiveCategory] = React.useState('all');
  const [search, setSearch] = React.useState('');

  const [stories, setStories] = React.useState<AfterStorySummaryDto[]>([]);

  // ── data ─────────────────────────────────────────────────────────────────
  //
  // Everything the page shows is fetched on mount now. With tabs, three of these
  // waited for a click that most people never made, so the sections they feed
  // effectively did not exist.

  React.useEffect(() => {
    if (!FEATURE_FLAGS.afterStory) return;
    let active = true;

    afterStoryService
      .listPublished({ page: 1, pageSize: 24 })
      // Guarded rather than trusted: a 200 whose body is not the paged shape
      // used to set `stories` to undefined, and the two slices below then took
      // the whole page down to the error boundary. The catch does not cover it,
      // because a malformed body is a resolved promise.
      .then((r) => { if (active) setStories(Array.isArray(r?.items) ? r.items : []); })
      // Stories are an addition to this page, not its subject. A failure hides
      // the section rather than breaking the trips people came for.
      .catch(() => { if (active) setStories([]); });

    return () => { active = false; };
  }, []);

  /*
   * Posts are fetched here rather than inside PostList, because two surfaces show
   * them and neither may show the same one twice: the rail takes the newest few
   * and the feed takes the rest. That is the same subtraction rule the stories
   * follow, and for the same reason.
   */
  const [posts, setPosts] = React.useState<TravelerPost[]>([]);
  React.useEffect(() => {
    let active = true;
    postsService.feed(24)
      .then((rows) => { if (active) setPosts(rows); })
      .catch(() => { if (active) setPosts([]); });
    return () => { active = false; };
  }, []);

  const dropPost = React.useCallback(
    (id: string) => setPosts((prev) => prev.filter((x) => x.id !== id)),
    [],
  );

  // ── derived ──────────────────────────────────────────────────────────────

  // Declared before the memos below because several of them read it.
  const isFiltering = activeCategory !== 'all' || Boolean(search.trim());

  /*
   * The lead trip is the newest Tripician Verified one.
   *
   * This slot used to hold "Trip of the day", which was `trips[today % length]` -
   * a rotation, not a recommendation. Nobody chose it, so calling it out as the
   * one to look at was a claim the page could not back. Verified is the opposite:
   * a person on the team read the whole plan and put our name on it, and it is
   * already a hard ranking tier everywhere else.
   *
   * Nothing renders when no trip is verified. A fallback to an arbitrary trip
   * would put the badge's meaning back where it started.
   */
  const verifiedTrips = React.useMemo(
    () => trips.filter((t: any) => (t.verified ?? t.Verified) === true),
    [trips],
  );
  const leadVerified = verifiedTrips.length > 0 ? verifiedTrips[0] : null;

  /*
   * Editor's choice: the story equivalent of Tripician Verified.
   *
   * Granted by hand from the admin desk and nowhere else. It is deliberately NOT
   * derived from reads or likes - a label saying an editor chose this has to mean
   * an editor chose this, and "most read" dressed up as a recommendation is the
   * kind of claim this product has already decided not to make.
   *
   * Newest pick first, so refreshing the row is a matter of picking another
   * rather than unpicking the old one.
   */
  const editorsChoice = React.useMemo(
    () =>
      stories
        .filter((st) => Boolean(st.editorsPickAt))
        .sort((a, b) => Date.parse(b.editorsPickAt!) - Date.parse(a.editorsPickAt!))
        .slice(0, 6),
    [stories],
  );
  const editorsChoiceIds = React.useMemo(
    () => new Set(editorsChoice.map((st) => st.id)),
    [editorsChoice],
  );

  // Ordering lives in utils/tripRanking.ts so the rule is testable: Tripician
  // Verified first as a hard tier, then community engagement, where comments
  // weigh heaviest because writing a reply costs far more than tapping a heart.
  const filteredTrips = React.useMemo(() => {
    /*
     * The lead verified trip is pulled out of the feed, because the Verified tier
     * already ranks it first: leaving it in would show the same trip in the
     * editorial split and again as the very next card.
     *
     * Only while the page is unfiltered, for the same reason the hero's stories
     * rejoin the feed under a filter - the module is hidden then, and a trip that
     * is invisible AND excluded is a trip a search cannot find.
     */
    let list = !isFiltering && leadVerified
      ? trips.filter((t: any) => (t.id || t.Id) !== (leadVerified.id || leadVerified.Id))
      : trips;

    if (activeCategory !== 'all') {
      list = list.filter((t) => (t.vibe || '').toLowerCase() === activeCategory);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          (t.name || '').toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q) ||
          (Array.isArray(t.countries) && t.countries.some((c: string) => c.toLowerCase().includes(q))),
      );
    }

    /*
     * Sorted in BOTH branches. It used to live in an `else`, so searching
     * returned raw server order.
     *
     * The server already orders verified-first, so `filter` alone would satisfy
     * the tier. That is exactly why this is written out: leaving a visible
     * product rule to be enforced only by an `OrderBy` three layers away in
     * another language means the next person to add a sort, a paginated endpoint
     * or a client-side merge breaks it and nothing says so.
     */
    return [...list].sort(compareTripsForFeed);
  }, [trips, activeCategory, search, isFiltering, leadVerified]);

  /*
   * The hero takes the first three; every other story goes into the feed.
   *
   * Slicing rather than sharing is what stops the page repeating itself - the
   * hero looked redundant the first time precisely because the rail underneath
   * showed the same stories. The trailing "More after stories" rail is gone
   * entirely: its contents are in the feed now, and a rail of the same cards
   * directly under a grid containing them is the same duplication in a
   * different shape.
   */
  /*
   * Three story surfaces, and no story may appear on two of them.
   *
   * Editor's choice wins any tie: it is the stronger signal, so a picked story
   * takes that row and the hero fills from what is left. Without this the first
   * story was routinely both - it is `stories[0]` AND the most recent pick - and
   * rendered twice within one screen.
   */
  const unpickedStories = React.useMemo(
    () => stories.filter((st) => !editorsChoiceIds.has(st.id)),
    [stories, editorsChoiceIds],
  );

  /*
   * The story rail stands in for Editor's choice when nobody has picked anything.
   *
   * Without it, an install with writers but no picks has no story BLOCK at all -
   * stories exist only scattered through the grid, which is what made the page
   * read as trips-with-extras. It takes from the same queue as the feed, so no
   * story is ever on the page twice.
   */
  const railStories = React.useMemo(
    () => (editorsChoice.length > 0 ? [] : unpickedStories.slice(0, 8)),
    [editorsChoice.length, unpickedStories],
  );

  /*
   * While filtering, the feed draws from ALL stories, not just the ones the rail
   * did not take.
   *
   * The rail hides as soon as a chip or a search is active, so with a plain slice
   * its stories became unreachable: searching "Oaxaca" returned nothing while an
   * Oaxaca story sat on the page a moment earlier. Excluding them is only correct
   * when the rail is actually showing them.
   */
  const feedStories = React.useMemo(
    () => (isFiltering ? stories : unpickedStories.slice(railStories.length)),
    [stories, isFiltering, unpickedStories, railStories.length],
  );

  /*
   * Stories go through the SAME chips and the SAME search box as trips.
   *
   * This is the whole point of the change. Stories used to sit in a hero above
   * the toolbar and a rail below the grid, which meant the page's actual
   * mechanics were trips-only: filtering to Culture returned culture trips and
   * never the culture story, and searching Kyoto could not find the Kyoto story
   * sitting two screens further down the same page.
   *
   * The vibe ids are shared - `Trips.Vibe` and a story's `vibe` both come from
   * the VIBES map - so one chip legitimately filters both.
   */
  const filteredStories = React.useMemo(() => {
    let list = feedStories;

    if (activeCategory !== 'all') {
      list = list.filter((st) => (st.vibe || '').toLowerCase() === activeCategory);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (st) =>
          (st.title || '').toLowerCase().includes(q) ||
          (st.summary || '').toLowerCase().includes(q) ||
          (st.destination || '').toLowerCase().includes(q) ||
          (Array.isArray(st.countries) && st.countries.some((c) => c.toLowerCase().includes(q))),
      );
    }

    return list;
  }, [feedStories, activeCategory, search]);

  /**
   * One feed, both kinds.
   *
   * Trips keep their ranked order exactly - the Verified tier is a product rule
   * and interleaving must not disturb it - and a story is dropped in after every
   * third trip. On the three-column grid that puts stories on a diagonal rather
   * than in a stripe, so they read as part of the feed instead of a band bolted
   * through it, and every screenful has one.
   *
   * Any stories left over when the trips run out are appended, so a community
   * with more writers than planners still shows all of them.
   */
  const railPosts = React.useMemo(() => posts.slice(0, 6), [posts]);

  /*
   * Posts the rail did not take. Under a filter the rail is hidden, so the feed
   * would be showing nothing rather than everything: posts carry no vibe and no
   * destination, so there is nothing for a chip or a search to match, and putting
   * them in unfiltered results would be answering a question nobody asked.
   */
  const feedPosts = React.useMemo(
    () => (isFiltering ? [] : posts.slice(6)),
    [posts, isFiltering],
  );

  const feed = React.useMemo(() => {
    const out: Array<
      | { kind: 'trip'; key: string; data: any }
      | { kind: 'story'; key: string; data: AfterStorySummaryDto }
      | { kind: 'post'; key: string; data: TravelerPost }
    > = [];
    const trips = filteredTrips;
    const stories = filteredStories;

    /*
     * The gap is derived, not fixed.
     *
     * A constant of three put the first story in slot four, which on a
     * three-column grid means the entire first row is trips - the one row most
     * people ever see. Spreading the stories we actually have across the trips we
     * actually have puts one near the top whatever the ratio, and keeps them
     * arriving all the way down instead of clumping at one end.
     *
     * Floor of two so two stories can never land side by side, which reads as a
     * band through the feed rather than part of it.
     */
    const step = stories.length === 0
      ? Number.POSITIVE_INFINITY
      : Math.max(2, Math.floor(trips.length / (stories.length + 1)));

    let s = 0;
    trips.forEach((t, i) => {
      out.push({ kind: 'trip', key: `trip-${t.id || t.Id || i}`, data: t });
      if ((i + 1) % step === 0 && s < stories.length) {
        const st = stories[s++];
        out.push({ kind: 'story', key: `story-${st.id}`, data: st });
      }
    });

    // Anything left over when the trips run out. A community with more writers
    // than planners still shows every story.
    for (; s < stories.length; s++) {
      out.push({ kind: 'story', key: `story-${stories[s].id}`, data: stories[s] });
    }

    // Posts are spread through what is already there rather than appended, or a
    // quiet week would end the page with a block of one-line notes.
    if (feedPosts.length > 0) {
      const gap = Math.max(2, Math.floor(out.length / (feedPosts.length + 1)));
      feedPosts.forEach((post, i) => {
        const at = Math.min(out.length, (i + 1) * gap + i);
        out.splice(at, 0, { kind: 'post', key: `post-${post.id}`, data: post });
      });
    }

    return out;
  }, [filteredTrips, filteredStories, feedPosts]);

  const handleTripClick = (trip: any) => {
    const tripId = trip.id || trip.Id;
    if (tripId) navigate(tripPath({ id: tripId, name: trip.name }), { state: { trip } });
  };

  // Open trips are a subset of published, so no second fetch. Full ones stay
  // listed: "Full" is useful information, and the trip may free up.
  //
  // Filtered by the same chips and search as everything else, and NOT hidden while
  // filtering. It used to vanish the moment you touched a chip, which is what made
  // recruitment unfindable: the one module you can act on disappeared on first use.
  const openTrips = React.useMemo(() => {
    let list = trips.filter((t: any) => t.joinPolicy === 'OpenToRequests');
    if (activeCategory !== 'all') {
      list = list.filter((t) => (t.vibe || '').toLowerCase() === activeCategory);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          (t.name || '').toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q) ||
          (Array.isArray(t.countries) && t.countries.some((c: string) => c.toLowerCase().includes(q))),
      );
    }
    return [...list].sort(compareTripsForFeed).slice(0, 12);
  }, [trips, activeCategory, search]);
  const activeCategoryLabel = CATEGORIES.find((c) => c.id === activeCategory)?.label || 'All';


  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Seo
        title="Community - Real Trips from Travellers"
        description="Real itineraries published by the travellers who took them. Browse the community's trips, read what the trips were actually like, and copy any plan into your own."
        path="/community"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Tripician Community',
          url: 'https://tripician.com/community',
          description:
            'Real travel itineraries, after stories, trending journeys and travel companions from the Tripician community.',
        }}
      />

      <Box sx={{ maxWidth: CONTENT_MAX, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 3, md: 5 }, pb: 10 }}>
        <motion.div initial="hidden" animate="visible" variants={staggerContainer(0.08, 0.05)}>

          {/* ── 1. Masthead ── */}
          <motion.div variants={staggerItem}>
            <PageHeader
              title="Community"
              subtitle="What travellers are doing right now, the plans behind it, and how it actually went."
            />
          </motion.div>

          {/* ── 2. The two things people arrive wanting to do ──
              Say something about the trip you are on, or start the one you are
              not. QuickPlanCard is out of PageHeader's action slot so both get
              real width instead of being squeezed into a third column. */}
          <motion.div variants={staggerItem}>
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                mt: { xs: 2.5, md: 3 },
                flexDirection: { xs: 'column', lg: 'row' },
                // Stretch, because these two are a declared pair: same radius,
                // same border, same shadow. A 20px difference between them read
                // as a mistake rather than a hierarchy, and it left the gutter
                // above the toolbar two different sizes across the page. Both
                // cards pin their bottom block so the space lands between their
                // blocks rather than as a hole under one of them.
                alignItems: 'stretch',
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
                <PostComposer onPosted={(p) => setPosts((prev) => [p, ...prev])} />
              </Box>
              <QuickPlanCard token={token} />
            </Box>
          </motion.div>

          {/* ── 3. Toolbar ── */}
          <motion.div variants={staggerItem}>
            <Box
              sx={{
                mt: { xs: 2.5, md: 3.5 },
                display: 'flex',
                gap: 1.5,
                flexDirection: { xs: 'column-reverse', md: 'row' },
                alignItems: { xs: 'stretch', md: 'center' },
                justifyContent: 'space-between',
              }}
            >
              <ChipRail sx={{ flex: 1, minWidth: 0 }}>
                {CATEGORIES.map((c) => (
                  <FilterChip
                    key={c.id}
                    label={c.label}
                    Icon={c.Icon}
                    active={activeCategory === c.id}
                    onClick={() => setActiveCategory(c.id)}
                  />
                ))}
              </ChipRail>
              <SearchField
                value={search}
                onChange={setSearch}
                placeholder="Search destinations, trips, vibes..."
                sx={{ width: { xs: '100%', md: 320 }, flexShrink: 0 }}
              />
            </Box>
          </motion.div>

          {loading && (
            <Box sx={{ mt: 4 }}>
              <CardGridSkeleton count={6} minWidth={300} />
            </Box>
          )}

          {!loading && error && (
            <Box sx={{ mt: 4 }}>
              <ErrorState
                title="Couldn't load the community"
                description={error}
                onRetry={reload}
              />
            </Box>
          )}

          {!loading && !error && (
            <>
              {/* ── 4. Tripician Verified, editorial split ──
                  Suppressed while filtering: a standing editorial pick is not an
                  answer to a search, and the trip is still in the results below. */}
              {!isFiltering && leadVerified && (
                <Box sx={{ mt: 4 }}>
                  <FeatureTripCard
                    trip={leadVerified}
                    eyebrow="Tripician Verified"
                    onClick={() => handleTripClick(leadVerified)}
                  />
                </Box>
              )}

              {/* ── 5. Editor's choice ──
                  Portrait story cards against the landscape trip rail below, so
                  two adjacent rails still read as two different things. */}
              {FEATURE_FLAGS.afterStory && !isFiltering && editorsChoice.length > 0 && (
                <Box sx={{ mt: { xs: 5, md: 6 } }}>
                  <SectionHeader
                    title="Editor's choice"
                    subtitle="Writing we think is worth your time, picked by hand"
                    action={<SeeAllLink to="/stories" />}
                  />
                  <ScrollRail gap={2.5} ariaLabel="Editor's choice stories">
                    {editorsChoice.map((st) => (
                      <Box key={st.id} sx={{ flexShrink: 0, width: { xs: 220, sm: 252 } }}>
                        <StoryCard story={st} />
                      </Box>
                    ))}
                  </ScrollRail>
                </Box>
              )}

              {/* ── 5a. From the road ──
                  The reason to reopen the page. Everything else here changes when
                  somebody finishes a trip; this changes while they are on one. */}
              {!isFiltering && (
                <Box sx={{ mt: { xs: 4, md: 5 } }}>
                  <SectionHeader
                    title="From the road"
                    subtitle="Travellers posting as it happens"
                    action={<SeeAllLink to="/posts" />}
                  />
                  {railPosts.length > 0 ? (
                    <Box sx={{ display: 'grid', gap: 1.5 }}>
                      {railPosts.map((post) => (
                        <PostCard key={post.id} post={post} onRemoved={dropPost} />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Nobody has posted yet. Yours would be the first.
                    </Typography>
                  )}
                </Box>
              )}

              {/* ── 5b. Happening now ──
                  Real records only, so this has something to show on an install
                  with almost no published trips. */}
              {!isFiltering && <ActivityFeed />}

              {/* ── 5b. After stories, only when nobody has picked one ──
                  Editor's choice is the story rail when it has content. This
                  stands in for it otherwise, so a community with writers but no
                  picks still opens with a story block rather than trips alone. */}
              {FEATURE_FLAGS.afterStory && !isFiltering && railStories.length > 0 && (
                <StoryStrip
                  stories={railStories}
                  subtitle="What the trips were actually like, written by the people who went"
                  seeAllHref="/stories"
                />
              )}

              {/* ── 6. Trips looking for people ──
                  Above the grid, because it is the only module on this page you
                  can ACT on rather than read: these have a spare place and a
                  person waiting on an answer. */}
              {openTrips.length > 0 && (
                <Box sx={{ mt: 4 }} id="looking-for-people">
                  <SectionHeader
                    title="Trips looking for people"
                    subtitle="Organisers with a spare place. The organiser approves everyone who joins."
                    action={<SeeAllLink to="/trips/looking-for-people" />}
                  />
                  <ScrollRail gap={2.5} ariaLabel="Trips looking for people">
                    {openTrips.map((t: any) => (
                      <Box key={t.id || t.Id} sx={{ flexShrink: 0, width: { xs: 264, sm: 300 } }}>
                        <CommunityTripCard trip={t} onClick={() => handleTripClick(t)} />
                      </Box>
                    ))}
                  </ScrollRail>
                </Box>
              )}

              {/* ── 5. The feed: itineraries and stories together ──
                  One grid, both kinds, filtered by the same chips and the same
                  search box. The two cards are deliberately different shapes -
                  a trip is landscape and bordered, a story is 4:5 and borderless
                  with its type on the photograph - so which is which is legible
                  at thumbnail size without a badge explaining it.

                  `alignItems: start` because those two shapes have different
                  heights: stretching would pad the shorter card to match its
                  neighbour and throw away the silhouette that does the work. */}
              <Box sx={{ mt: { xs: 5, md: 6 } }}>
                <SectionHeader
                  title={
                    search.trim()
                      ? 'Search results'
                      : activeCategory === 'all'
                        ? 'From the community'
                        : `${activeCategoryLabel}`
                  }
                  subtitle={
                    isFiltering
                      ? describeFeed(filteredTrips.length, filteredStories.length)
                      : 'Itineraries people published, and the stories of how they actually went'
                  }
                  action={<SeeAllLink to="/trips" label="All trips" />}
                />

                {feed.length > 0 ? (
                  <Box sx={{ ...gridSx, alignItems: 'start' }}>
                    <AnimatePresence mode="popLayout">
                      {feed.map((item) => (
                        <motion.div key={item.key} layout variants={staggerItem}>
                          {item.kind === 'trip' ? (
                            <CommunityTripCard trip={item.data} onClick={() => handleTripClick(item.data)} />
                          ) : item.kind === 'story' ? (
                            <StoryCard story={item.data} />
                          ) : (
                            <PostCard post={item.data} onRemoved={dropPost} />
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </Box>
                ) : (
                  <EmptyState
                    icon={IconCompass}
                    title="Nothing here yet"
                    description={
                      isFiltering
                        ? 'No trips or stories match that yet. Try another vibe, or clear the filters.'
                        : 'Once travellers publish their itineraries and stories they will show up here.'
                    }
                    {...(isFiltering
                      ? {
                          actionLabel: 'Clear filters',
                          onAction: () => {
                            setActiveCategory('all');
                            setSearch('');
                          },
                        }
                      : { actionLabel: 'Plan a trip', onAction: () => navigate('/tripplanner') })}
                  />
                )}
              </Box>

              {/* ── After stories, below the plans ──
                  A pitch, not a second rail. The stories themselves are in the
                  feed above; repeating those cards here is the duplication the
                  hero was once wrongly cut for. What was missing is the ask -
                  a page full of other people's trips never suggested you write
                  one of your own.

                  Hidden during a search, on the same rule as everything else
                  below the results: a search should answer the search. */}
              {FEATURE_FLAGS.afterStory && !isFiltering && (
                <Box
                  sx={{
                    mt: { xs: 5, md: 7 },
                    p: { xs: 3, md: 5 },
                    borderRadius: '20px',
                    border: `1px solid ${theme.custom.surface.border}`,
                    bgcolor: theme.custom.surface.brandTint,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    flexWrap: 'wrap',
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 260 }}>
                    <Typography variant="overline" sx={{ color: 'primary.main' }}>
                      After stories
                    </Typography>
                    <Typography
                      variant="h4"
                      component="h2"
                      sx={{ color: 'text.primary', mt: 0.5 }}
                    >
                      You came back with more than photos
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: 'text.secondary', mt: 1.25, maxWidth: '60ch', lineHeight: 1.7 }}
                    >
                      The part nobody writes down is the part everyone wants to read. Say how the
                      trip actually went, keep it as a printed book, and send the next traveller
                      somewhere worth going.
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    <Button
                      variant="contained"
                      startIcon={<IconFeather size={16} />}
                      onClick={() => window.dispatchEvent(new CustomEvent('story:create'))}
                    >
                      Share your story
                    </Button>
                    <Button variant="outlined" onClick={() => navigate('/stories')}>
                      Read others first
                    </Button>
                  </Box>
                </Box>
              )}
            </>
          )}
        </motion.div>
      </Box>
    </Box>
  );
};

export default Community;
