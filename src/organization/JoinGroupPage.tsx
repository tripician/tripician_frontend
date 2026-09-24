// /join/group/:token: where an invite link lands. Shows the group first, joins only when the person says so.

import React from 'react';
import { Avatar, Box, Button, CircularProgress, Typography, useTheme } from '@mui/material';
import { IconLinkOff, IconUsersGroup } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import Seo from '../components/Seo';
import EmptyState from '../components/ui/EmptyState';
import { useRequireAuth } from '../auth/AuthGate';
import { useAuthToken } from '../hooks/useAuth0Token';
import { apiServices } from '../services/APIs/apiServices';
import { serverMessage } from '../utils/apiError';
import { groupHomePath } from './groupLogic';
import type { GroupInvitePreview } from './types';

const JoinGroupPage: React.FC = () => {
  const { token: inviteToken = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const requireAuth = useRequireAuth();
  const { token } = useAuthToken();

  const [preview, setPreview] = React.useState<GroupInvitePreview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [joining, setJoining] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    apiServices.previewGroupInvite(inviteToken)
      .then((r) => { if (active) setPreview(r.data ?? null); })
      .catch(() => { if (active) setPreview(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [inviteToken, token]);

  const join = async () => {
    if (!requireAuth({ reason: 'Sign in to join the group. The invite link will still work after.' })) return;
    setJoining(true);
    setError(null);
    try {
      const r = await apiServices.joinGroupByInvite(inviteToken);
      navigate(groupHomePath(r.data?.organizationId ?? preview?.id ?? ''), { replace: true });
    } catch (err) {
      // A refusal says why in its own words; with none, the link itself stopped working.
      setError(serverMessage(err) ?? 'This link no longer works. Ask the group for a new one.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}><CircularProgress size={30} /></Box>;
  }

  if (!preview) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center', px: 2 }}>
        <EmptyState
          icon={IconLinkOff}
          title="This invite link does not work"
          description="It may have been replaced or turned off. Ask whoever sent it for a new one."
          actionLabel="Find a group"
          onAction={() => navigate('/stories?kind=groups')}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '70vh', display: 'grid', placeItems: 'center', px: 2, py: 6 }}>
      <Seo title={`Join ${preview.name}`} description={`You have been invited to ${preview.name} on Tripician.`} path={`/join/group/${inviteToken}`} noindex />
      <Box sx={{ width: '100%', maxWidth: 440, textAlign: 'center', p: { xs: 3, sm: 4 }, borderRadius: '20px', border: `1px solid ${theme.custom.surface.border}`, bgcolor: 'background.paper', boxShadow: theme.custom.shadows.card }}>
        <Avatar src={preview.logoUrl ?? undefined} variant="rounded" sx={{ width: 72, height: 72, borderRadius: '18px', mx: 'auto', bgcolor: 'primary.main', fontWeight: 700 }}>
          {preview.name.charAt(0).toUpperCase()}
        </Avatar>
        <Typography variant="overline" component="p" sx={{ color: 'text.secondary', mt: 2 }}>You are invited to</Typography>
        <Typography variant="h3" component="h1">{preview.name}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
          <IconUsersGroup size={16} /> {preview.memberCount} {preview.memberCount === 1 ? 'member' : 'members'}
        </Typography>
        {preview.description && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2, whiteSpace: 'pre-line' }}>{preview.description}</Typography>
        )}
        <Typography variant="caption" component="p" sx={{ color: 'text.secondary', mt: 2 }}>
          Members see the group's plans and stories. Going on a trip is still decided trip by trip.
        </Typography>

        {preview.alreadyMember ? (
          <Button variant="contained" fullWidth onClick={() => navigate(groupHomePath(preview.id))} sx={{ mt: 3, textTransform: 'none', fontWeight: 700 }}>
            You are already in. Open the group
          </Button>
        ) : (
          <Button variant="contained" fullWidth disabled={joining} onClick={() => void join()} sx={{ mt: 3, textTransform: 'none', fontWeight: 700 }}>
            {joining ? 'Joining' : `Join ${preview.name}`}
          </Button>
        )}
        {error && <Typography variant="body2" color="error" sx={{ mt: 1.5 }}>{error}</Typography>}
      </Box>
    </Box>
  );
};

export default JoinGroupPage;
