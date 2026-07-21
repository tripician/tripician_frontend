import React from 'react';
import { Box, Typography } from '@mui/material';

interface SectionHeaderProps {
  /** Small uppercase kicker above the title */
  overline?: string;
  title: string;
  subtitle?: string;
  /** Right-aligned slot: buttons, filters, "See all" links */
  action?: React.ReactNode;
  sx?: object;
}

/** Consistent section heading used across dashboard, community, and profile surfaces. */
const SectionHeader: React.FC<SectionHeaderProps> = ({ overline, title, subtitle, action, sx }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 2,
      mb: 2.5,
      ...sx,
    }}
  >
    <Box sx={{ minWidth: 0 }}>
      {overline && (
        <Typography variant="overline" sx={{ color: 'primary.main', display: 'block', mb: 0.25 }}>
          {overline}
        </Typography>
      )}
      <Typography variant="h4" component="h2" noWrap>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
    {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
  </Box>
);

export default SectionHeader;
