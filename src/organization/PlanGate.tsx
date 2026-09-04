import React from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { useAppShell } from '../pages/PageLayout/AppShellContext';
import { IconSparkles } from '@tabler/icons-react';
import { hasFeature } from './types';
import type { Organization } from './types';

interface PlanGateProps {
  organization: Organization | null;
  feature: string;
  title: string;
  body: string;
  children: React.ReactNode;
}

/**
 * Shows what Business adds, rather than hiding it.
 *
 * A control nobody can see is a control nobody buys, so the locked state names
 * the feature and links to pricing instead of rendering nothing. The server
 * refuses the write independently: this is the explanation, not the guard.
 */
const PlanGate: React.FC<PlanGateProps> = ({ organization, feature, title, body, children }) => {
  const theme = useTheme();
  const { openProDialog } = useAppShell();

  if (hasFeature(organization, feature)) return <>{children}</>;

  return (
    <Box
      sx={{
        borderRadius: '16px',
        border: `1px dashed ${theme.custom.surface.border}`,
        bgcolor: theme.custom.surface.brandTint,
        p: { xs: 2.5, md: 3 },
        textAlign: 'center',
      }}
    >
      <IconSparkles size={22} style={{ color: theme.palette.primary.main }} />
      <Typography variant="h6" component="p" sx={{ color: 'text.primary', mt: 1, mb: 0.75 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 460, mx: 'auto', mb: 2 }}>
        {body}
      </Typography>
      <Button
        variant="contained"
        onClick={openProDialog}
        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '50px', px: 2.5 }}
      >
        See Tripician Business
      </Button>
    </Box>
  );
};

export default PlanGate;
