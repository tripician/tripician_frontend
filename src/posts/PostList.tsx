import React from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import PostCard from './PostCard';
import { postsService } from './postsService';
import type { TravelerPost } from './types';

export interface PostListHandle {
  /** Drops a freshly created post straight in, so the author sees it land. */
  prepend: (post: TravelerPost) => void;
}

interface PostListProps {
  /** Omit for the public feed; set to show one traveller's posts. */
  authorUserId?: number;
  pageSize?: number;
  emptyMessage?: string;
  /** Omit for both. The road page asks for notes because it renders questions itself. */
  kind?: 'note' | 'question';
}

/**
 * A column of posts that pages by timestamp.
 *
 * Paging on `before` rather than an offset because the feed grows at the top: an
 * offset would show a duplicate row the moment somebody posts while you are
 * reading.
 */
const PostList = React.forwardRef<PostListHandle, PostListProps>(({
  authorUserId, pageSize = 20, emptyMessage, kind,
}, ref) => {
  const [posts, setPosts] = React.useState<TravelerPost[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [exhausted, setExhausted] = React.useState(false);

  const load = React.useCallback(async (before?: string | null) => {
    return authorUserId != null
      ? postsService.byAuthor(authorUserId, pageSize, before)
      : postsService.feed(pageSize, before, kind);
  }, [authorUserId, pageSize, kind]);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setExhausted(false);
    load()
      .then((rows) => {
        if (!active) return;
        setPosts(rows);
        setExhausted(rows.length < pageSize);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load, pageSize]);

  React.useImperativeHandle(ref, () => ({
    prepend: (post) => setPosts((prev) => [post, ...prev]),
  }), []);

  const more = async () => {
    const last = posts[posts.length - 1];
    if (!last || loadingMore) return;
    setLoadingMore(true);
    try {
      const rows = await load(last.createdAt);
      setPosts((prev) => [...prev, ...rows]);
      if (rows.length < pageSize) setExhausted(true);
    } finally {
      setLoadingMore(false);
    }
  };

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
        {emptyMessage ?? 'Nothing yet. Be the first to say something.'}
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      {posts.map((p) => (
        <PostCard key={p.id} post={p} onRemoved={removeOne} />
      ))}

      {!exhausted && (
        <Button
          onClick={() => void more()}
          disabled={loadingMore}
          sx={{ textTransform: 'none', fontWeight: 700, justifySelf: 'center', mt: 1 }}
        >
          {loadingMore ? 'Loading' : 'Show more'}
        </Button>
      )}
    </Box>
  );
});

PostList.displayName = 'PostList';

export default PostList;
