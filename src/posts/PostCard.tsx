import React from 'react';
import { Avatar, Box, IconButton, Tooltip, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  IconHeart, IconHeartFilled, IconMessageCircle2, IconMapPin, IconTrash,
  IconRosetteDiscountCheckFilled,
} from '@tabler/icons-react';
import { formatRelativeTime } from '../utils/relativeTime';
import CardTypeTag from '../components/ui/CardTypeTag';
import PhotoMosaic from '../components/ui/PhotoMosaic';
import { POST_LIMITS } from './types';
import { postsService } from './postsService';
import type { TravelerPost } from './types';

interface PostCardProps {
  post: TravelerPost;
  /** Fixed width turns the card into a rail item instead of a column row. */
  width?: number;
  /** The permalink already shows this post, so it does not link to itself. */
  linkToPost?: boolean;
  onRemoved?: (id: string) => void;
}

/**
 * One traveller post.
 *
 * Text first, pictures second, actions last. Deliberately plain next to a trip
 * card and a story card: those are objects somebody made, this is somebody
 * talking. Photographs are cropped to a strip rather than given a hero, because
 * a post with one picture and a post with four should occupy similar space in a
 * column that is meant to be scrolled.
 */
const PostCard: React.FC<PostCardProps> = ({ post, width, linkToPost = true, onRemoved }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const border = theme.custom.surface.border;

  const [liked, setLiked] = React.useState(post.viewerLiked);
  const [likeCount, setLikeCount] = React.useState(post.likeCount);
  const [busy, setBusy] = React.useState(false);

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    // Optimistic: a heart should move under the finger, not after a round trip.
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    try {
      setLikeCount(await postsService.toggleLike(post.id));
    } catch {
      setLiked(wasLiked);
      setLikeCount(post.likeCount);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    try {
      await postsService.remove(post.id);
      onRemoved?.(post.id);
    } catch { /* stays on screen; a reload will settle it */ }
  };

  const open = () => { if (linkToPost) navigate(`/post/${post.id}`); };

  const photos = post.media.slice(0, POST_LIMITS.maxPhotos);

  return (
    <Box
      onClick={open}
      sx={{
        position: 'relative',
        borderRadius: '16px',
        border: `1px solid ${border}`,
        bgcolor: 'background.paper',
        overflow: 'hidden',
        p: 2,
        cursor: linkToPost ? 'pointer' : 'default',
        transition: `border-color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
        '&:hover': linkToPost ? { borderColor: 'text.disabled' } : {},
        ...(width ? { flexShrink: 0, width } : { width: '100%' }),
      }}
    >
      <CardTypeTag kind={post.kind === 'question' ? 'question' : 'post'} />

      {/* Padded right so the byline clears the ribbon. There is no cover here for
          it to sit over, so it shares the header row's space instead. */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1, pr: 4 }}>
        <Avatar
          src={post.authorAvatarUrl ?? undefined}
          onClick={(e) => { e.stopPropagation(); navigate(`/traveler/${post.authorUserId}`); }}
          sx={{ width: 32, height: 32, fontSize: 13, bgcolor: 'primary.main', cursor: 'pointer' }}
        >
          {post.authorName.charAt(0).toUpperCase()}
        </Avatar>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }} noWrap>
              {post.authorName}
            </Typography>
            {post.authorIdentityVerified && (
              <Tooltip title="Identity verified" arrow>
                <Box component="span" sx={{ display: 'inline-flex', color: '#0EA5E9' }}>
                  <IconRosetteDiscountCheckFilled size={14} />
                </Box>
              </Tooltip>
            )}
          </Box>
          <Typography variant="caption" sx={{ color: 'text.disabled' }} noWrap>
            {post.placeName && (
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, mr: 0.75 }}>
                <IconMapPin size={11} />
                {post.placeName}
              </Box>
            )}
            {formatRelativeTime(post.createdAt)}
          </Typography>
        </Box>

        {post.viewerCanDelete && (
          <IconButton size="small" onClick={remove} aria-label="Delete post" sx={{ color: 'text.disabled' }}>
            <IconTrash size={14} />
          </IconButton>
        )}
      </Box>

      {post.title && (
        <Typography
          variant="subtitle1"
          component="h3"
          sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.35, mb: 0.5 }}
        >
          {post.title}
        </Typography>
      )}

      {/* Plain text from the server, rendered as a child so React escapes it. */}
      {post.body && (
        <Typography
          variant="body2"
          sx={{ color: 'text.primary', lineHeight: 1.6, whiteSpace: 'pre-line', mb: photos.length > 0 ? 1.25 : 1 }}
        >
          {post.body}
        </Typography>
      )}

      {photos.length > 0 && (
        <PhotoMosaic photos={photos} sx={{ mb: 1 }} />
      )}

      {post.tripId && post.tripName && (
        <Box
          component="button"
          type="button"
          onClick={(e) => { e.stopPropagation(); navigate(`/trip/${post.tripId}`); }}
          sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.5, mb: 1,
            border: `1px solid ${border}`, bgcolor: 'transparent', cursor: 'pointer',
            borderRadius: '50px', px: 1.25, py: 0.4,
            fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: 'text.secondary',
            '&:hover': { borderColor: 'text.disabled', color: 'text.primary' },
          }}
        >
          {post.tripName}
        </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          component="button"
          type="button"
          onClick={toggleLike}
          aria-label={liked ? 'Unlike' : 'Like'}
          sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.5,
            border: 'none', bgcolor: 'transparent', p: 0, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
            color: liked ? 'primary.main' : 'text.secondary',
            '&:hover': { color: 'primary.main' },
          }}
        >
          {liked ? <IconHeartFilled size={15} /> : <IconHeart size={15} stroke={1.9} />}
          {likeCount > 0 && likeCount}
        </Box>

        <Box
          component="button"
          type="button"
          onClick={(e) => { e.stopPropagation(); navigate(`/post/${post.id}`); }}
          sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.5,
            border: 'none', bgcolor: 'transparent', p: 0, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: 'text.secondary',
            '&:hover': { color: 'primary.main' },
          }}
        >
          <IconMessageCircle2 size={15} stroke={1.9} />
          {post.replyCount > 0 && post.replyCount}
        </Box>
      </Box>
    </Box>
  );
};

export default PostCard;
