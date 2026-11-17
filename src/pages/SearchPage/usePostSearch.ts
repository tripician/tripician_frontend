import React from 'react';
import { postsService } from '../../posts/postsService';
import type { TravelerPost } from '../../posts/types';
import { postMatches } from './topResults';

/** How many matches one search asks for: plenty for the Posts tab, newest first. */
const TAKE = 30;

// Answers per query for this visit, so Back and tab switches never ask twice.
const cache = new Map<string, TravelerPost[]>();

/**
 * Posts people shared that match a search: every word in the description,
 * title, place or tags (GET /api/posts?q). Checked again here, so a server from
 * before post search, which sends the latest posts, never shows a wrong one.
 */
export function usePostSearch(query: string, enabled: boolean): { posts: TravelerPost[]; loading: boolean } {
  const key = query.trim().toLowerCase();
  const [state, setState] = React.useState<{ key: string; posts: TravelerPost[] } | null>(null);

  React.useEffect(() => {
    if (!enabled || !key || cache.has(key)) return;
    let active = true;
    postsService
      .feed(TAKE, null, 'note', false, false, query.trim())
      .catch(() => [] as TravelerPost[])
      .then((posts) => {
        const matches = posts.filter((p) => postMatches(p, query));
        cache.set(key, matches);
        if (active) setState({ key, posts: matches });
      });
    return () => { active = false; };
  }, [enabled, key, query]);

  if (!enabled || !key) return { posts: [], loading: false };
  const cached = cache.get(key);
  if (cached) return { posts: cached, loading: false };
  return { posts: state?.key === key ? state.posts : [], loading: true };
}
