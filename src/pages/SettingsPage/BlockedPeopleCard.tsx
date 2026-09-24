import React from 'react';
import { Avatar, Box, Button, Card, CardContent, Typography, useTheme } from '@mui/material';
import { apiServices, type BlockedUser } from '../../services/APIs/apiServices';

// The people you blocked, and the way back. Blocking happens from a post or a profile; undoing it lives here.
const BlockedPeopleCard: React.FC<{ sx?: object }> = ({ sx }) => {
  const theme = useTheme();
  const [people, setPeople] = React.useState<BlockedUser[] | null>(null);
  const [busy, setBusy] = React.useState<number | null>(null);

  React.useEffect(() => {
    let active = true;
    apiServices.getBlocks()
      .then((r) => { if (active) setPeople(Array.isArray(r.data) ? r.data : []); })
      .catch(() => { if (active) setPeople([]); });
    return () => { active = false; };
  }, []);

  const unblock = async (person: BlockedUser) => {
    setBusy(person.userId);
    try {
      await apiServices.unblockUser(person.userId);
      setPeople((prev) => (prev ?? []).filter((p) => p.userId !== person.userId));
    } catch {
      window.dispatchEvent(new CustomEvent('app:error', { detail: { message: 'That did not save. Try again.' } }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card sx={sx}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Blocked people</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, mb: 2 }}>
          You and they do not see each other&apos;s posts or answers, and they cannot message you. They are not told.
        </Typography>

        {people === null ? null : people.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>You have not blocked anyone.</Typography>
        ) : (
          <Box sx={{ borderRadius: '12px', border: `1px solid ${theme.custom.surface.border}`, overflow: 'hidden' }}>
            {people.map((p, i) => (
              <Box key={p.userId} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25, borderTop: i === 0 ? 'none' : `1px solid ${theme.custom.surface.border}` }}>
                <Avatar src={p.avatarUrl ?? undefined} sx={{ width: 32, height: 32, fontSize: 13 }}>{(p.name ?? '?').charAt(0).toUpperCase()}</Avatar>
                <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 0 }} noWrap>{p.name || 'A traveller'}</Typography>
                <Button size="small" onClick={() => void unblock(p)} disabled={busy === p.userId} sx={{ textTransform: 'none', fontWeight: 700 }}>
                  Unblock
                </Button>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default BlockedPeopleCard;
