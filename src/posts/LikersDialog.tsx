import React from 'react';
import {
  Avatar, Box, CircularProgress, Dialog, DialogTitle, IconButton, Typography, useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { IconX } from '@tabler/icons-react';
import { postsService } from './postsService';
import type { PostLiker } from './types';

interface LikersDialogProps {
  postId: string;
  open: boolean;
  likeCount: number;
  viewerLiked: boolean;
  onClose: () => void;
}

// Everyone who liked a post whom we may name, each one tap from their profile.
const LikersDialog: React.FC<LikersDialogProps> = ({ postId, open, likeCount, viewerLiked, onClose }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [likers, setLikers] = React.useState<PostLiker[] | null>(null);

  React.useEffect(() => {
    if (!open || likers !== null) return;
    let live = true;
    void postsService.likers(postId).then((rows) => { if (live) setLikers(rows); });
    return () => { live = false; };
  }, [open, likers, postId]);

  // Private profiles and blocked people still count toward the total, they are just not listed.
  const unnamed = likers ? Math.max(0, likeCount - likers.length - (viewerLiked ? 1 : 0)) : 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      // Portalled, but React bubbles through the tree: without this a tap in here opens the post underneath.
      onClick={(e) => e.stopPropagation()}
      PaperProps={{ sx: { borderRadius: '16px' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', pr: 1, py: 1.25, fontSize: 16, fontWeight: 700 }}>
        <Box component="span" sx={{ flex: 1 }}>Likes</Box>
        <IconButton aria-label="Close" onClick={onClose} size="small">
          <IconX size={18} />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderTop: `1px solid ${theme.custom.surface.border}`, maxHeight: 420, overflowY: 'auto', py: 0.5 }}>
        {likers === null ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}>
            <CircularProgress size={20} />
          </Box>
        ) : (
          <>
            {viewerLiked && (
              <Typography variant="body2" sx={{ px: 2.5, py: 1.25, color: 'text.secondary' }}>
                You liked this.
              </Typography>
            )}
            {likers.map((l) => (
              <Box
                key={l.userId}
                component="button"
                type="button"
                onClick={() => { onClose(); navigate(`/traveler/${l.userId}`); }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  width: '100%',
                  px: 2.5,
                  py: 1,
                  border: 0,
                  bgcolor: 'transparent',
                  cursor: 'pointer',
                  font: 'inherit',
                  textAlign: 'left',
                  '&:hover': { bgcolor: theme.custom.surface.hover },
                  '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: -2 },
                }}
              >
                <Avatar src={l.avatarUrl ?? undefined} sx={{ width: 36, height: 36, fontSize: 14, bgcolor: 'primary.main' }}>
                  {l.name.charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: 'text.primary', minWidth: 0 }}>
                  {l.name}
                </Typography>
              </Box>
            ))}
            {unnamed > 0 && (
              <Typography variant="caption" component="p" sx={{ px: 2.5, py: 1.25, color: 'text.secondary' }}>
                {unnamed === 1 ? '1 more person' : `${unnamed} more people`} also liked this.
              </Typography>
            )}
            {likers.length === 0 && !viewerLiked && unnamed === 0 && (
              <Typography variant="body2" sx={{ px: 2.5, py: 2, color: 'text.secondary' }}>
                No likes yet.
              </Typography>
            )}
          </>
        )}
      </Box>
    </Dialog>
  );
};

export default LikersDialog;
