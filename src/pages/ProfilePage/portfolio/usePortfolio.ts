import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { apiServices } from '../../../services/APIs/apiServices';
import { postsService } from '../../../posts/postsService';
import type { TravelerPost } from '../../../posts/types';
import type { AfterStorySummaryDto } from '../../../afterstory/types';
import type { TripVM } from '../tripViewModel';
import { normalizeFeaturedItems, type FeaturedItem } from '../featuredItems';
import {
  buildJournal,
  JOURNAL_POSTS_PAGE,
  type JournalEntry,
  type JournalFilter,
} from './journal';
import {
  mergePhotos,
  nextPhotosCursor,
  normalizeAuthorPhotosPage,
  PHOTOBOOK_PAGE,
  PHOTOBOOK_PREVIEW,
  photosFromPosts,
  type AuthorPhoto,
} from './photobook';

export type LoadStatus = 'loading' | 'ready' | 'error';

const isNotFound = (err: unknown) => axios.isAxiosError(err) && err.response?.status === 404;

// ── Featured ───────────────────────────────────────────────────────────────

export interface FeaturedState {
  items: FeaturedItem[];
  status: LoadStatus;
  /** The server has no Featured endpoint yet: show the quote, offer no editor. */
  unsupported: boolean;
  reload: () => void;
  /** What the editor saved, as the server resolved it. */
  replace: (items: FeaturedItem[]) => void;
}

export function useFeatured(userId: number | null): FeaturedState {
  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [unsupported, setUnsupported] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (userId == null) return;
    let active = true;
    setStatus((s) => (s === 'ready' ? s : 'loading'));
    apiServices
      .getProfileFeatured(userId)
      .then(({ data }) => {
        if (!active) return;
        setItems(normalizeFeaturedItems(data));
        setUnsupported(false);
        setStatus('ready');
      })
      .catch((err) => {
        if (!active) return;
        // An older server, or a profile the reader may not see: an empty shelf, never an error page.
        setUnsupported(isNotFound(err));
        setStatus(isNotFound(err) ? 'ready' : 'error');
      });
    return () => {
      active = false;
    };
  }, [userId, nonce]);

  return {
    items,
    status,
    unsupported,
    reload: useCallback(() => setNonce((n) => n + 1), []),
    replace: useCallback((next: FeaturedItem[]) => setItems(next), []),
  };
}

// ── Photobook ──────────────────────────────────────────────────────────────

/** Posts read per page, and pages at most, when the Photobook is read from posts. */
const FALLBACK_TAKE = 50;
const FALLBACK_PAGES = 6;

/** A server without the photos endpoint: read the Photobook from their posts, so it is never missing. */
async function photobookFromPosts(userId: number) {
  const posts: TravelerPost[] = [];
  let before: string | undefined;
  for (let page = 0; page < FALLBACK_PAGES; page += 1) {
    const list = await postsService.byAuthor(userId, FALLBACK_TAKE, before);
    posts.push(...list);
    if (list.length < FALLBACK_TAKE) break;
    before = list[list.length - 1].createdAt;
  }
  const items = photosFromPosts(posts);
  return { items, total: items.length, hasMore: false };
}

export interface PhotobookState {
  items: AuthorPhoto[];
  total: number;
  hasMore: boolean;
  status: LoadStatus;
  loadingMore: boolean;
  reload: () => void;
  loadMore: () => Promise<void>;
}

export function usePhotobook(userId: number | null): PhotobookState {
  const [items, setItems] = useState<AuthorPhoto[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [nonce, setNonce] = useState(0);
  // Read from posts once the endpoint answered 404; paging then has nowhere to go.
  const fromPosts = useRef(false);

  useEffect(() => {
    if (userId == null) return;
    let active = true;
    setStatus((s) => (s === 'ready' ? s : 'loading'));
    (async () => {
      try {
        const page = normalizeAuthorPhotosPage(await postsService.authorPhotos(userId, PHOTOBOOK_PREVIEW));
        if (!active) return;
        fromPosts.current = false;
        setItems(page.items);
        setTotal(page.total);
        setHasMore(page.hasMore);
        setStatus('ready');
      } catch (err) {
        if (!isNotFound(err)) {
          if (active) setStatus('error');
          return;
        }
        try {
          const page = await photobookFromPosts(userId);
          if (!active) return;
          fromPosts.current = true;
          setItems(page.items);
          setTotal(page.total);
          setHasMore(false);
          setStatus('ready');
        } catch {
          if (active) setStatus('error');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [userId, nonce]);

  const loadMore = useCallback(async () => {
    if (userId == null || loadingMore || !hasMore || fromPosts.current) return;
    setLoadingMore(true);
    try {
      const page = normalizeAuthorPhotosPage(
        await postsService.authorPhotos(userId, PHOTOBOOK_PAGE, nextPhotosCursor(items)),
      );
      setItems((prev) => mergePhotos(prev, page.items));
      setTotal((prev) => Math.max(prev, page.total));
      setHasMore(page.hasMore && page.items.length > 0);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [userId, loadingMore, hasMore, items]);

  return { items, total, hasMore, status, loadingMore, reload: useCallback(() => setNonce((n) => n + 1), []), loadMore };
}

// ── Travel Journal ─────────────────────────────────────────────────────────

/** How many extra pages of posts a short journal may read to fill what is on screen. */
const AUTO_FILL_PAGES = 4;

export interface JournalState {
  entries: (filter: JournalFilter) => JournalEntry[];
  /** True until the plans, stories and the first page of posts are in. */
  loading: boolean;
  postsHasMore: boolean;
  loadingPosts: boolean;
  /** Reads the next page of posts. */
  loadMorePosts: () => Promise<void>;
  /** Fills until `count` entries of `filter` exist, or the posts run out. */
  ensure: (filter: JournalFilter, count: number) => void;
  /** A post written on this page, shown at once. */
  prepend: (post: TravelerPost) => void;
  reload: () => void;
}

export function useTravelJournal({
  userId,
  isOwner,
  trips,
  stories,
  sourcesLoading,
}: {
  userId: number | null;
  isOwner: boolean;
  trips: readonly TripVM[];
  stories: readonly AfterStorySummaryDto[];
  sourcesLoading: boolean;
}): JournalState {
  const [posts, setPosts] = useState<TravelerPost[]>([]);
  const [postsHasMore, setPostsHasMore] = useState(false);
  const [postsReady, setPostsReady] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [want, setWant] = useState<{ filter: JournalFilter; count: number } | null>(null);
  const autoPages = useRef(0);
  const busy = useRef(false);

  useEffect(() => {
    if (userId == null) return;
    let wanted = userId;
    setPostsReady(false);
    autoPages.current = 0;
    void postsService.byAuthor(userId, JOURNAL_POSTS_PAGE).then((rows) => {
      if (wanted !== userId) return;
      setPosts(rows);
      setPostsHasMore(rows.length >= JOURNAL_POSTS_PAGE);
      setPostsReady(true);
    });
    return () => {
      wanted = -1;
    };
  }, [userId, nonce]);

  const loadMorePosts = useCallback(async () => {
    if (userId == null || busy.current || !postsHasMore) return;
    const oldest = posts[posts.length - 1];
    if (!oldest) return;
    busy.current = true;
    setLoadingPosts(true);
    try {
      const older = await postsService.byAuthor(userId, JOURNAL_POSTS_PAGE, oldest.createdAt);
      setPosts((prev) => [...prev, ...older]);
      setPostsHasMore(older.length >= JOURNAL_POSTS_PAGE);
    } finally {
      busy.current = false;
      setLoadingPosts(false);
    }
  }, [userId, posts, postsHasMore]);

  const entries = useCallback(
    (filter: JournalFilter) =>
      buildJournal({ profileUserId: userId ?? 0, isOwner, trips, stories, posts, postsHasMore, filter }),
    [userId, isOwner, trips, stories, posts, postsHasMore],
  );

  // Photo posts and repeats are skipped, so a page of posts can yield few
  // entries. Read a few more pages, never endlessly, until what is asked for
  // is on screen.
  useEffect(() => {
    if (!want || !postsReady || !postsHasMore || busy.current) return;
    if (entries(want.filter).length >= want.count) return;
    if (autoPages.current >= AUTO_FILL_PAGES) return;
    autoPages.current += 1;
    void loadMorePosts();
  }, [want, postsReady, postsHasMore, entries, loadMorePosts]);

  const ensure = useCallback((filter: JournalFilter, count: number) => {
    autoPages.current = 0;
    setWant((prev) => (prev && prev.filter === filter && prev.count === count ? prev : { filter, count }));
  }, []);

  const prepend = useCallback((post: TravelerPost) => setPosts((prev) => [post, ...prev]), []);

  return useMemo(
    () => ({
      entries,
      loading: sourcesLoading || !postsReady,
      postsHasMore,
      loadingPosts,
      loadMorePosts,
      ensure,
      prepend,
      reload: () => setNonce((n) => n + 1),
    }),
    [entries, sourcesLoading, postsReady, postsHasMore, loadingPosts, loadMorePosts, ensure, prepend],
  );
}
