// /join/trip/:token: where a trip invite lands. Shows the trip first, joins only when the person says so.

import React from 'react';
import { Box, Button, CircularProgress, Typography, useTheme } from '@mui/material';
import { IconCalendar, IconLinkOff, IconUsers } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import Seo from '../components/Seo';
import EmptyState from '../components/ui/EmptyState';
import { useRequireAuth } from '../auth/AuthGate';
import { useAuthToken } from '../hooks/useAuth0Token';
import { apiServices, type TripInvitePreview } from '../services/APIs/apiServices';
import { serverMessage } from '../utils/apiError';
import { tripCoverPhoto } from '../utils/tripCover';
import { tripPath } from '../utils/tripSlug';
import { inviteDates } from './tripInvite';

const JoinTripPage: React.FC = () => {
  const { token: inviteToken = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const requireAuth = useRequireAuth();
  const { token } = useAuthToken();

  const [preview, setPreview] = React.useState<TripInvitePreview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [joining, setJoining] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    apiServices.previewTripInvite(inviteToken)
      .then((r) => { if (active) setPreview(r.data ?? null); })
      .catch(() => { if (active) setPreview(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [inviteToken, token]);

  const open = (tripId: string) => navigate(tripPath({ id: tripId, name: preview?.name }), { replace: true });

  const join = async () => {
    if (!requireAuth({ reason: 'Sign in or create an account to join the trip. The invite link will still work after.' })) return;
    setJoining(true);
    setError(null);
    try {
      const r = await apiServices.joinTripByInvite(inviteToken);
      open(r.data?.tripId ?? preview?.tripId ?? '');
    } catch (err) {
      setError(serverMessage(err) ?? 'This link no longer works. Ask whoever sent it for a new one.');
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
          actionLabel="See trips you can join"
          onAction={() => navigate('/stories?kind=join')}
        />
      </Box>
    );
  }

  const cover = tripCoverPhoto({ bannerPhotoUrl: preview.bannerPhotoUrl, countries: preview.countries });
  const dates = inviteDates(preview.startDate, preview.endDate);

  return (
    <Box sx={{ minHeight: '70vh', display: 'grid', placeItems: 'center', px: 2, py: 6 }}>
      <Seo title={`Join ${preview.name}`} description={`You have been invited to plan ${preview.name} together on Tripician.`} path={`/join/trip/${inviteToken}`} noindex />
      <Box sx={{ width: '100%', maxWidth: 460, overflow: 'hidden', borderRadius: '20px', border: `1px solid ${theme.custom.surface.border}`, bgcolor: 'background.paper', boxShadow: theme.custom.shadows.card }}>
        {cover && <Box component="img" src={cover} alt="" sx={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block' }} />}
        <Box sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
          <Typography variant="overline" component="p" sx={{ color: 'text.secondary' }}>
            {preview.ownerName ? `${preview.ownerName} invited you to` : 'You are invited to'}
          </Typography>
          <Typography variant="h3" component="h1">{preview.name}</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', columnGap: 2, rowGap: 0.5, mt: 1, color: 'text.secondary' }}>
            {preview.countries.length > 0 && <Typography variant="body2">{preview.countries.slice(0, 3).join(', ')}</Typography>}
            {dates && (
              <Typography variant="body2" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                <IconCalendar size={15} /> {dates}
              </Typography>
            )}
            <Typography variant="body2" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <IconUsers size={15} /> {preview.memberCount} {preview.memberCount === 1 ? 'person' : 'people'} planning
            </Typography>
          </Box>
          <Typography variant="caption" component="p" sx={{ color: 'text.secondary', mt: 2 }}>
            You will plan the days together, share costs and see what everyone is bringing. Leave any time.
          </Typography>

          {preview.alreadyMember ? (
            <Button variant="contained" fullWidth onClick={() => open(preview.tripId)} sx={{ mt: 3, textTransform: 'none', fontWeight: 700 }}>
              You are already on this trip. Open it
            </Button>
          ) : (
            <Button variant="contained" fullWidth disabled={joining} onClick={() => void join()} sx={{ mt: 3, textTransform: 'none', fontWeight: 700 }}>
              {joining ? 'Joining' : 'Join the trip'}
            </Button>
          )}
          {error && <Typography variant="body2" color="error" sx={{ mt: 1.5 }}>{error}</Typography>}
        </Box>
      </Box>
    </Box>
  );
};

export default JoinTripPage;
