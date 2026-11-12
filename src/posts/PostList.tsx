import React from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import PostCard from './PostCard';
import { postsService } from './postsService';
import { USER_BLOCKED_EVENT, blockedIdFrom } from '../utils/blocking';
import type { TravelerPost } from './types';

export interface PostListHandle {
  /** Drops a freshly created post straight in, so the author sees it land. */
  prepend: (post: TravelerPost) => void;
}

interface PostListProps {
  /** Omit for the public feed; set to show one traveller's posts. */
  authorUserId?: number;
  pageSize?: number;
  emptyMessage?: React.ReactNode;
  /** Omit for both. The road page asks for notes because it renders questions itself. */
  kind?: 'note' | 'question';
  /** Something to place in the column after this many posts, or at the end of a shorter list. */
  insertAfter?: { index: number; node: React.ReactNode };
  /** Only people the viewer follows, and the viewer. */
  following?: boolean;
  /** Shown under the last post once there is nothing more to load. Omit to show nothing. */
  endMessage?: React.ReactNode;
}

/** How far ahead of the bottom the next page starts loading, so scrolling never waits on it. */
const PREFETCH_MARGIN = '0px 0px 900px 0px';

/**
 * The element that actually scrolls this list. The app shell scrolls inside
 * <main>, not the window, and an observer rooted on the viewport would only see
 * the sentinel once <main> had already scrolled it into view, which leaves no
 * room to load ahead.
 */
function scrollParent(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement;
  while (node && node !== document.body) {
    const { overflowY } = window.getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * A column of posts that pages by timestamp, loading the next page by itself as
 * the reader nears the end.
 *
 * Paging on `before` rather than an offset because the feed grows at the top: an
 * offset would show a duplicate row the moment somebody posts while you are
 * reading.
 *
 * It used to stop at a "Show more" button, and at the real end it simply
 * stopped, which read as a page that had not finished loading. Now it keeps
 * going on its own, and the end says so (`endMessage`).
 */
const PostList = React.forwardRef<PostListHandle, PostListProps>(({
  authorUserId, pageSize = 20, emptyMessage, kind, insertAfter, following = false, endMessage,
}, ref) => {
  const [posts, setPosts] = React.useState<TravelerPost[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [exhausted, setExhausted] = React.useState(false);
  const [moreFailed, setMoreFailed] = React.useState(false);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  // One page at a time, whatever fires the request: the observer, a retry, or both.
  const inFlight = React.useRef(false);

  const load = React.useCallback(async (before?: string | null) => {
    return authorUserId != null
      ? postsService.byAuthor(authorUserId, pageSize, before)
      : postsService.feed(pageSize, before, kind, false, following);
  }, [authorUserId, pageSize, kind, following]);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setExhausted(false);
    setMoreFailed(false);
    load()
      .then((rows) => {
        if (!active) return;
        setPosts(rows);
        setExhausted(rows.length < pageSize);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load, pageSize]);

  // A block anywhere drops that person's posts here at once; the server stops sending them from the next page on.
  React.useEffect(() => {
    const onBlocked = (e: Event) => {
      const id = blockedIdFrom(e);
      if (id !== null) setPosts((prev) => prev.filter((p) => p.authorUserId !== id));
    };
    window.addEventListener(USER_BLOCKED_EVENT, onBlocked);
    return () => window.removeEventListener(USER_BLOCKED_EVENT, onBlocked);
  }, []);

  React.useImperativeHandle(ref, () => ({
    prepend: (post) => setPosts((prev) => [post, ...prev]),
  }), []);

  const more = React.useCallback(async () => {
    const last = posts[posts.length - 1];
    if (!last || inFlight.current || exhausted) return;
    inFlight.current = true;
    setLoadingMore(true);
    setMoreFailed(false);
    try {
      const rows = await load(last.createdAt);
      // A post can be in two pages when several share a timestamp; show it once.
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...rows.filter((r) => !seen.has(r.id))];
      });
      if (rows.length < pageSize) setExhausted(true);
    } catch {
      // Stops the automatic loading until they ask, rather than retrying into a dead connection.
      setMoreFailed(true);
    } finally {
      inFlight.current = false;
      setLoadingMore(false);
    }
  }, [posts, exhausted, load, pageSize]);

  // Read through a ref, so the observer below is not rebuilt on every render.
  const moreRef = React.useRef(more);
  moreRef.current = more;

  /*
   * Infinite scroll. A sentinel under the last post; when it comes within
   * PREFETCH_MARGIN of the bottom of the scroller, the next page loads.
   *
   * Rebuilt after every page on purpose: observing starts with an immediate
   * check, so when a page is too short to push the sentinel out of range (a
   * tall screen, or posts removed by a block) the next one loads straight away
   * instead of waiting for a scroll that cannot happen.
   */
  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el || loading || exhausted || moreFailed || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void moreRef.current();
      },
      { root: scrollParent(el), rootMargin: PREFETCH_MARGIN },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, exhausted, moreFailed, posts.length]);

  const removeOne = (id: string) => setPosts((prev) => prev.filter((p) => p.id !== id));

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 5 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (posts.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary', py: 3 }}>
        {emptyMessage ?? 'Nothing here yet. Say where you are, or ask the people who have been.'}
      </Typography>
    );
  }

  return (
    // minmax(0, 1fr): a scrolling strip placed in the list must not widen the column past the screen.
    <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 1.5 }}>
      {posts.map((p, i) => (
        <React.Fragment key={p.id}>
          <PostCard post={p} onRemoved={removeOne} />
          {insertAfter && i === Math.min(insertAfter.index, posts.length) - 1 && insertAfter.node}
        </React.Fragment>
      ))}

      {!exhausted && (
        <Box ref={sentinelRef} sx={{ display: 'grid', placeItems: 'center', minHeight: 56, py: 1 }}>
          {moreFailed ? (
            <Box sx={{ display: 'grid', justifyItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Couldn&apos;t load more posts.
              </Typography>
              <Button onClick={() => void more()} sx={{ textTransform: 'none', fontWeight: 700 }}>
                Try again
              </Button>
            </Box>
          ) : (
            // Visible only while a page is on its way; otherwise the space is just where the next posts land.
            <CircularProgress size={22} aria-label="Loading more posts" sx={{ visibility: loadingMore ? 'visible' : 'hidden' }} />
          )}
        </Box>
      )}

      {exhausted && endMessage && (
        <Box
          role="status"
          sx={{ display: 'grid', justifyItems: 'center', gap: 1.25, pt: 3, pb: 2, textAlign: 'center' }}
        >
          <Box
            aria-hidden
            sx={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              border: '2px solid',
              borderColor: 'primary.main',
              color: 'primary.main',
            }}
          >
            <CheckRoundedIcon sx={{ fontSize: 28 }} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}>
            {endMessage}
          </Typography>
        </Box>
      )}
    </Box>
  );
});

PostList.displayName = 'PostList';

export default PostList;
