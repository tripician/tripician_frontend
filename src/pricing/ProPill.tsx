import React from 'react';
import { HEADER_FULL_LABELS_MIN_WIDTH } from '../pages/PageLayout/navConfig';
import { Box, Tooltip, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { IconSparkles } from '@tabler/icons-react';
import { BRAND } from '../theme';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import type { PlanId } from './types';

interface ProPillProps {
  onClick: () => void;
}

/**
 * The one place in the shell that says Pro exists.
 *
 * Brand-coloured but NOT a second solid fill: "Plan a trip" beside it is the
 * page's primary action, and two coral buttons in one cluster means neither is
 * primary. A coral tint with coral type reads as premium without competing.
 *
 * Always shown, with two faces. On the free plan it invites; on Pro it confirms.
 * Hiding it once somebody subscribes would remove the only way back to what they
 * are paying for.
 */
const ProPill: React.FC<ProPillProps> = ({ onClick }) => {
  const theme = useTheme();
  const { token } = useAuthToken();
  const [planId, setPlanId] = React.useState<PlanId | null>(null);

  React.useEffect(() => {
    if (!token) { setPlanId(null); return; }
    let active = true;
    // Through the resolver, not the profile column: a lapsed subscription still
    // reads as Pro on the profile and must not show a Pro badge here.
    apiServices.getMyPlan(token)
      .then((r) => { if (active) setPlanId(r.data?.planId ?? null); })
      .catch(() => { if (active) setPlanId(null); });
    return () => { active = false; };
  }, [token]);

  const onPro = planId === 'pro';
  const label = onPro ? 'Pro' : 'Get Pro';

  return (
    <Tooltip title={onPro ? 'Your plan, and what Business adds' : 'What Tripician Pro adds'} arrow>
      <Box
        component="button"
        type="button"
        onClick={onClick}
        aria-label={onPro ? 'Your Tripician Pro plan' : 'See what Tripician Pro adds'}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          flexShrink: 0,
          height: 36,
          px: { xs: 1, sm: 1.5 },
          borderRadius: '50px',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: '0.82rem',
          fontWeight: 700,
          letterSpacing: '0.01em',
          color: 'primary.main',
          bgcolor: alpha(BRAND.coral, 0.09),
          border: `1px solid ${alpha(BRAND.coral, onPro ? 0.4 : 0.22)}`,
          transition: `background-color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
          '&:hover': { bgcolor: alpha(BRAND.coral, 0.16) },
          '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
        }}
      >
        <IconSparkles size={15} stroke={2} />
        {/* Icon-only until the header has room for words. The tooltip carries
            the meaning either way, so this stays findable rather than hidden. */}
        <Box
          component="span"
          sx={{ display: 'none', [`@media (min-width:${HEADER_FULL_LABELS_MIN_WIDTH}px)`]: { display: 'inline' } }}
        >
          {label}
        </Box>
      </Box>
    </Tooltip>
  );
};

export default ProPill;
