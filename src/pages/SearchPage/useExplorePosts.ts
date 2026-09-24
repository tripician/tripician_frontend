import React from 'react';
import { postsService } from '../../posts/postsService';
import type { TravelerPost } from '../../posts/types';

const PAGE = 24;

interface ExplorePostsSnapshot {
  posts: TravelerPost[];
  loading: boolean;
  exhausted: boolean;
}

// Kept at module level so going Back to Search shows the same grid instead of starting over.
let snapshot: ExplorePostsSnapshot = { posts: [], loading: false, exhausted: false };
let started = false;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

const set = (patch: Partial<ExplorePostsSnapshot>) => {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((l) => l());
};

function loadPage(): Promise<void> {
  if (inFlight || snapshot.exhausted) return inFlight ?? Promise.resolve();
  started = true;
  set({ loading: true });
  const oldest = snapshot.posts[snapshot.posts.length - 1]?.createdAt ?? null;
  inFlight = postsService.feed(PAGE, oldest, 'note', true)
    .then((page) => {
      const known = new Set(snapshot.posts.map((p) => p.id));
      set({
        posts: [...snapshot.posts, ...page.filter((p) => !known.has(p.id))],
        // The service answers a failure with an empty list, so an empty page also ends the paging.
        exhausted: page.length < PAGE,
        loading: false,
      });
    })
    .finally(() => { inFlight = null; });
  return inFlight;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const getSnapshot = () => snapshot;

/** Photo notes for the Search grid, a page at a time; nothing is fetched until enabled, when the grid is on screen. */
export function useExplorePosts(enabled = true): ExplorePostsSnapshot & { loadMore: () => void; ready: boolean } {
  const snap = React.useSyncExternalStore(subscribe, getSnapshot);
  React.useEffect(() => { if (enabled && !started) void loadPage(); }, [enabled]);
  const loadMore = React.useCallback(() => { void loadPage(); }, []);
  // Ready once the first page has answered, whether or not it held any photos.
  return { ...snap, loadMore, ready: snap.posts.length > 0 || snap.exhausted };
}
