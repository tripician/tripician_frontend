import React from 'react';
import { Box } from '@mui/material';
import SectionHeader from '../components/ui/SectionHeader';
import PostCard from './PostCard';
import { postsService } from './postsService';
import type { TravelerPost } from './types';

interface ProfilePostsProps {
  authorUserId: number;
  title: string;
  take?: number;
}

/**
 * One traveller's recent posts on their profile.
 *
 * Renders nothing at all when they have not posted. A section heading over an
 * empty box is how a product announces that a feature is dead, and this is the
 * newest thing here.
 */
const ProfilePosts: React.FC<ProfilePostsProps> = ({ authorUserId, title, take = 6 }) => {
  const [posts, setPosts] = React.useState<TravelerPost[]>([]);

  React.useEffect(() => {
    let active = true;
    postsService.byAuthor(authorUserId, take)
      .then((rows) => { if (active) setPosts(rows); })
      .catch(() => { if (active) setPosts([]); });
    return () => { active = false; };
  }, [authorUserId, take]);

  if (posts.length === 0) return null;

  return (
    <Box sx={{ mt: { xs: 5, md: 6 } }}>
      <SectionHeader title={title} subtitle="Short notes from the road" />
      <Box sx={{ display: 'grid', gap: 1.5 }}>
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onRemoved={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
          />
        ))}
      </Box>
    </Box>
  );
};

export default ProfilePosts;
