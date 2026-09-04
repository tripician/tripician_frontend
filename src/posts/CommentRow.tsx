import React from 'react';
import { Avatar, Box, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { formatRelativeTime } from '../utils/relativeTime';
import PhotoMosaic from '../components/ui/PhotoMosaic';
import { postsService } from './postsService';
import type { TravelerPost } from './types';

interface CommentRowProps {
  comment: TravelerPost;
  onRemoved?: (id: string) => void;
}

/**
 * One reply, inside the post it answers.
 *
 * Deliberately not a PostCard: nesting one would put a bordered box inside a
 * bordered box, and a reply is not a thing you can open. The bubble is the whole
 * silhouette, and the meta sits under it rather than in a header, so a two word
 * reply occupies two short lines.
 */
const CommentRow: React.FC<CommentRowProps> = ({ comment, onRemoved }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const remove = async () => {
    if (!window.confirm('Delete this reply? This cannot be undone.')) return;
    try {
      await postsService.remove(comment.id);
      onRemoved?.(comment.id);
    } catch { /* stays on screen; a reload will settle it */ }
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
      <Avatar
        src={comment.authorAvatarUrl ?? undefined}
        onClick={() => navigate(`/traveler/${comment.authorUserId}`)}
        sx={{ width: 28, height: 28, fontSize: 12, bgcolor: 'primary.main', cursor: 'pointer', flexShrink: 0 }}
      >
        {comment.authorName.charAt(0).toUpperCase()}
      </Avatar>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        {comment.body && (
          <Box
            sx={{
              display: 'inline-block',
              maxWidth: '100%',
              bgcolor: theme.custom.surface.hover,
              borderRadius: '14px',
              px: 1.5,
              py: 0.9,
            }}
          >
            <Typography
              component="span"
              onClick={() => navigate(`/traveler/${comment.authorUserId}`)}
              sx={{
                display: 'block', fontSize: 13, fontWeight: 700, color: 'text.primary',
                cursor: 'pointer', '&:hover': { textDecoration: 'underline' },
              }}
            >
              {comment.authorName}
            </Typography>
            <Typography sx={{ fontSize: 13.5, lineHeight: 1.5, color: 'text.primary', whiteSpace: 'pre-line' }}>
              {comment.body}
            </Typography>
          </Box>
        )}

        {comment.media.length > 0 && (
          <PhotoMosaic photos={comment.media} sx={{ mt: 0.75, maxWidth: 320 }} rounded={10} />
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.4, pl: 1.5 }}>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            {formatRelativeTime(comment.createdAt)}
          </Typography>

          {comment.viewerCanDelete && (
            <Box
              component="button"
              type="button"
              onClick={remove}
              sx={{
                border: 'none', bgcolor: 'transparent', p: 0, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: 'text.disabled',
                '&:hover': { color: 'error.main' },
              }}
            >
              Delete
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default CommentRow;
