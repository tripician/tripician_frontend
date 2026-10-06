import React from 'react';
import { Box, IconButton, Typography, useTheme } from '@mui/material';
import { IconCheck, IconClock, IconX } from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { readPlanWelcome, welcomeMessage } from '../pricing/planActivation';

/** The one line somebody sees on arriving home from paying, so a payment has a visible end. */
const PlanWelcomeBanner: React.FC = () => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [welcome, setWelcome] = React.useState(() => readPlanWelcome(location.state));

  // Taken out of history at once, so a refresh or the back button does not thank them twice.
  React.useEffect(() => {
    if (readPlanWelcome(location.state)) {
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    }
  }, [location.pathname, location.search, location.state, navigate]);

  if (!welcome) return null;

  return (
    <Box
      role="status"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        p: 1.75,
        mb: 2,
        borderRadius: '14px',
        bgcolor: 'background.paper',
        border: `1px solid ${theme.custom.surface.border}`,
      }}
    >
      <Box component="span" sx={{ color: 'primary.main', display: 'inline-flex', flexShrink: 0 }}>
        {welcome.active ? <IconCheck size={18} stroke={2.4} /> : <IconClock size={18} stroke={2} />}
      </Box>
      <Typography variant="body2" sx={{ color: 'text.primary', flex: 1 }}>
        {welcomeMessage(welcome)}
      </Typography>
      <IconButton size="small" aria-label="Dismiss" onClick={() => setWelcome(null)}>
        <IconX size={16} />
      </IconButton>
    </Box>
  );
};

export default PlanWelcomeBanner;
