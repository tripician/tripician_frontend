/**
 * Where the link at the foot of an email lands.
 *
 * Signed out by design. The person clicking arrived from a mail client and may
 * have no session anywhere, so the signature on the link is the whole of its
 * authority and this page asks for nothing.
 *
 * It also never says whether the link was valid, matching the endpoint. Telling
 * a visitor "no such account" would turn an unsubscribe link into a way to test
 * whether an email address is registered here.
 */

import React from 'react';
import { Box, Button, CircularProgress, Typography, useTheme } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IconMailOff } from '@tabler/icons-react';
import Seo from '../../components/Seo';
import { apiServices } from '../../services/APIs/apiServices';

const UnsubscribePage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [done, setDone] = React.useState(false);

  const u = Number(params.get('u'));
  const t = Number(params.get('t'));
  const k = params.get('k') ?? '';

  React.useEffect(() => {
    // Acted on immediately rather than behind a confirm button. Somebody
    // following this link has already decided, and a mail client that prefetches
    // it can only cause the thing they asked for.
    if (!Number.isFinite(u) || !Number.isFinite(t) || !k) { setDone(true); return; }
    let active = true;
    void apiServices.unsubscribeFromEmails(u, t, k)
      .catch(() => { /* the endpoint answers the same either way */ })
      .finally(() => { if (active) setDone(true); });
    return () => { active = false; };
  }, [u, t, k]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center' }}>
      <Seo title="Email preferences" description="Manage Tripician email notifications." path="/unsubscribe" noindex />

      <Box sx={{ maxWidth: 520, mx: 'auto', px: 3, py: 8, textAlign: 'center' }}>
        {!done ? (
          <CircularProgress size={28} />
        ) : (
          <>
            <Box
              sx={{
                width: 56, height: 56, borderRadius: '18px', mx: 'auto', mb: 2.5,
                display: 'grid', placeItems: 'center',
                color: 'primary.main', bgcolor: theme.custom.surface.brandTint,
              }}
            >
              <IconMailOff size={26} stroke={1.7} />
            </Box>

            <Typography variant="h3" component="h1" sx={{ mb: 1.5 }}>
              That is switched off
            </Typography>

            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4 }}>
              If that link was valid, those emails have stopped. You will still see everything
              in the app, and anything urgent about a trip you are on still reaches you there.
            </Typography>

            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button variant="contained" onClick={() => navigate('/settings?tab=notifications')}>
                Change what you get
              </Button>
              <Button variant="outlined" color="inherit" onClick={() => navigate('/')}>
                Go to Tripician
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

export default UnsubscribePage;
