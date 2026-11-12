import React from 'react';
import { Avatar, Box, ButtonBase, Dialog, DialogContent, IconButton, Skeleton, Typography } from '@mui/material';
import { IconChevronRight, IconX } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { apiServices } from '../../../services/APIs/apiServices';

export type FollowMode = 'followers' | 'following';

interface Person {
  userId: number;
  name: string;
  avatar: string | null;
}

/**
 * Who follows them, or whom they follow: the app's FollowList, as a dialog.
 * Tapping a figure in the header and getting nothing was a dead end; this is
 * where it goes. Each row opens that traveller's profile.
 */
const FollowListDialog: React.FC<{
  userId: number;
  mode: FollowMode | null;
  onClose: () => void;
  /** The signed-in reader, whose own row opens /profile. */
  viewerId?: number | null;
}> = ({ userId, mode, onClose, viewerId }) => {
  const navigate = useNavigate();
  const [people, setPeople] = React.useState<Person[] | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    if (!mode) return;
    let active = true;
    setPeople(null);
    setFailed(false);
    const call = mode === 'followers' ? apiServices.getFollowers(userId) : apiServices.getFollowing(userId);
    call
      .then(({ data }) => {
        if (active) setPeople(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [userId, mode]);

  const open = (id: number) => {
    onClose();
    navigate(viewerId != null && id === viewerId ? '/profile' : `/traveler/${id}`);
  };

  const title = mode === 'following' ? 'Following' : 'Followers';

  return (
    <Dialog open={!!mode} onClose={onClose} fullWidth maxWidth="xs" scroll="paper" aria-labelledby="follow-list-title">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5 }}>
        <Typography id="follow-list-title" sx={(theme) => ({ fontFamily: theme.custom.fontDisplay, fontWeight: 700, fontSize: '1.125rem', letterSpacing: '-0.01em' })}>
          {title}
        </Typography>
        <IconButton aria-label="Close" onClick={onClose} size="small"><IconX size={18} /></IconButton>
      </Box>
      <DialogContent dividers sx={{ p: 1, minHeight: 220 }}>
        {failed ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 6 }}>
            This list couldn’t load. Try again in a moment.
          </Typography>
        ) : people === null ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1 }}>
              <Skeleton variant="circular" width={40} height={40} />
              <Skeleton variant="text" width="50%" />
            </Box>
          ))
        ) : people.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 6 }}>
            {mode === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
          </Typography>
        ) : (
          people.map((p) => (
            <ButtonBase
              key={p.userId}
              onClick={() => open(p.userId)}
              sx={(theme) => ({
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 1.5,
                py: 1,
                borderRadius: '12px',
                textAlign: 'left',
                fontFamily: 'inherit',
                '&:hover': { bgcolor: theme.custom.surface.hover },
              })}
            >
              <Avatar src={p.avatar ?? undefined} alt="" sx={{ width: 40, height: 40, bgcolor: 'primary.main', fontWeight: 700 }}>
                {p.name?.charAt(0).toUpperCase()}
              </Avatar>
              <Typography sx={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: '0.9375rem' }} noWrap>{p.name}</Typography>
              <IconChevronRight size={16} style={{ opacity: 0.45 }} />
            </ButtonBase>
          ))
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FollowListDialog;
