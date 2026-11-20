import React from 'react';
import { Avatar, Box, IconButton, Menu, MenuItem, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { IconBan, IconDots, IconEyeOff, IconFlag, IconTrash } from '@tabler/icons-react';
import { useRequireAuth } from '../auth/AuthGate';
import { formatRelativeTime } from '../utils/relativeTime';
import { confirmAndBlock } from '../utils/blocking';
import PhotoSlider from '../components/ui/PhotoSlider';
import ReportDialog from '../components/ui/ReportDialog';
import { postsService } from './postsService';
import { hideComment, isCommentHidden, unhideComment } from './hiddenComments';
import type { TravelerPost } from './types';

interface CommentRowProps {
  comment: TravelerPost;
  /** The signed-in viewer's user id, if any: decides between "your comment" and "someone else's". */
  viewerId?: string | null;
  onRemoved?: (id: string) => void;
  /** Set where replying to a comment makes sense (a note's thread, not a question's answers). */
  onReply?: (comment: TravelerPost) => void;
}

const actionSx = {
  border: 'none', bgcolor: 'transparent', p: 0, cursor: 'pointer',
  fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: 'text.secondary',
  '&:hover': { color: 'text.primary', textDecoration: 'underline' },
  '&:focus-visible': { outline: '2px solid', outlineOffset: 2, borderRadius: '4px' },
} as const;

/**
 * One reply, inside the post it answers.
 *
 * Deliberately not a PostCard: nesting one would put a bordered box inside a
 * bordered box, and a reply is not a thing you can open. The bubble is the whole
 * silhouette, and the meta sits under it rather than in a header, so a two word
 * reply occupies two short lines.
 *
 * Under the bubble: when it was written, and Reply. Beside it, a "⋯" menu: your
 * own comment can be deleted; anyone else's can be hidden (for you only),
 * reported, or its author blocked, and deleted too when the post is yours.
 */
const CommentRow: React.FC<CommentRowProps> = ({ comment, viewerId, onRemoved, onReply }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const requireAuth = useRequireAuth();

  const isOwn = Boolean(viewerId) && String(comment.authorUserId) === String(viewerId);
  const firstName = comment.authorName.split(' ')[0] || 'this person';

  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);
  const [reporting, setReporting] = React.useState(false);
  const [reported, setReported] = React.useState(false);
  // Your own comment offers only Delete, so without that there is nothing to open.
  const hasOptions = !isOwn || comment.viewerCanDelete;
  // Hidden before this visit: gone. Hidden during it: a line with Undo, as on Facebook.
  const [hiddenEarlier] = React.useState(() => isCommentHidden(comment.id, viewerId));
  const [hiddenNow, setHiddenNow] = React.useState(false);

  const closeMenu = () => setMenuAnchor(null);

  const hide = () => {
    closeMenu();
    hideComment(comment.id, viewerId);
    setHiddenNow(true);
  };

  const undoHide = () => {
    unhideComment(comment.id, viewerId);
    setHiddenNow(false);
  };

  const remove = async () => {
    closeMenu();
    if (!window.confirm('Delete this comment? This cannot be undone.')) return;
    try {
      await postsService.remove(comment.id);
      onRemoved?.(comment.id);
    } catch {
      window.dispatchEvent(new CustomEvent('app:error', { detail: { message: 'That comment could not be deleted. Try again.' } }));
    }
  };

  const block = () => {
    closeMenu();
    if (!requireAuth({ reason: 'Sign in to block people you do not want to hear from.' })) return;
    // On success the block event removes this person's comments from the thread.
    void confirmAndBlock(comment.authorUserId, comment.authorName).catch(() => {
      window.dispatchEvent(new CustomEvent('app:error', { detail: { message: 'That person could not be blocked. Try again.' } }));
    });
  };

  if (hiddenEarlier && !hiddenNow) return null;

  if (hiddenNow) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 4.5, py: 0.25 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {reported ? 'Thanks for reporting. This comment is hidden for you.' : 'Comment hidden. Only you see this change.'}
        </Typography>
        <Box component="button" type="button" onClick={undoHide} sx={actionSx}>
          Undo
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex', gap: 1, alignItems: 'flex-start',
        // The "⋯" shows on hover or keyboard focus, and always where there is no hover.
        '& .comment-more': { opacity: 0, transition: 'opacity 120ms ease' },
        '&:hover .comment-more, & .comment-more:focus-visible, & .comment-more[aria-expanded="true"]': { opacity: 1 },
        '@media (hover: none)': { '& .comment-more': { opacity: 1 } },
      }}
    >
      <Avatar
        src={comment.authorAvatarUrl ?? undefined}
        onClick={() => navigate(`/traveler/${comment.authorUserId}`)}
        sx={{ width: 28, height: 28, fontSize: 12, bgcolor: 'primary.main', cursor: 'pointer', flexShrink: 0 }}
      >
        {comment.authorName.charAt(0).toUpperCase()}
      </Avatar>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, maxWidth: '100%' }}>
          {comment.body && (
            <Box
              sx={{
                display: 'inline-block',
                minWidth: 0,
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
              <Typography sx={{ fontSize: 13.5, lineHeight: 1.5, color: 'text.primary', whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
                {comment.body}
              </Typography>
            </Box>
          )}

          {hasOptions && (
            <IconButton
              className="comment-more"
              size="small"
              aria-label={`Options for ${firstName}'s comment`}
              aria-haspopup="menu"
              aria-expanded={Boolean(menuAnchor)}
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              sx={{ flexShrink: 0, color: 'text.disabled', '&:hover': { color: 'text.primary' } }}
            >
              <IconDots size={16} />
            </IconButton>
          )}
        </Box>

        {comment.media.length > 0 && (
          <PhotoSlider photos={comment.media} photography={Boolean(comment.isPhotography)} sx={{ mt: 0.75, maxWidth: 320 }} rounded={10} postedAt={comment.createdAt} />
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mt: 0.4, pl: 1.5 }}>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            {formatRelativeTime(comment.createdAt)}
          </Typography>

          {onReply && !isOwn && (
            <Box component="button" type="button" onClick={() => onReply(comment)} sx={actionSx}>
              Reply
            </Box>
          )}
        </Box>
      </Box>

      {/* Portalled, but React still bubbles clicks through the tree, so the menu
          stops them or an item would also open the post behind it. */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {!isOwn && (
          <MenuItem onClick={hide}>
            <IconEyeOff size={15} style={{ marginRight: 10 }} />
            Hide comment
          </MenuItem>
        )}
        {!isOwn && (
          <MenuItem onClick={block} sx={{ alignItems: 'flex-start' }}>
            <IconBan size={15} style={{ marginRight: 10, marginTop: 3 }} />
            <Box>
              <Typography sx={{ fontSize: 'inherit' }}>Block {firstName}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                You won&apos;t see each other&apos;s posts or comments.
              </Typography>
            </Box>
          </MenuItem>
        )}
        {!isOwn && (
          <MenuItem onClick={() => { closeMenu(); setReporting(true); }}>
            <IconFlag size={15} style={{ marginRight: 10 }} />
            Report comment
          </MenuItem>
        )}
        {comment.viewerCanDelete && (
          <MenuItem onClick={() => void remove()} sx={{ color: 'error.main' }}>
            <IconTrash size={15} style={{ marginRight: 10 }} />
            Delete comment
          </MenuItem>
        )}
      </Menu>

      <ReportDialog
        open={reporting}
        noun="comment"
        onClose={() => {
          setReporting(false);
          // Reporting it is also the end of seeing it, as in the app.
          if (reported) {
            hideComment(comment.id, viewerId);
            setHiddenNow(true);
          }
        }}
        onSubmit={async (reason, detail) => {
          await postsService.report(comment.id, reason, detail);
          setReported(true);
        }}
      />
    </Box>
  );
};

export default CommentRow;
