import React from 'react';
import { Box, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Right-aligned slot for a filter, count, or action button. */
  action?: React.ReactNode;
  sx?: SxProps<Theme>;
}

/**
 * The page title block: display-serif h1, one line of plain subtitle, optional
 * action on the right.
 *
 * Community, Dashboard and Profile each hand-rolled this with the same six
 * style lines copied between them, which is how their H1s drifted to different
 * sizes. Sizing comes from the `h1` variant so it can never drift again -
 * do not pass a `fontSize` here.
 *
 * An earlier version of this component (in PageLayout/CommonLayouts, never
 * imported by anything) paired the title with a coral icon square and a pulsing
 * "LIVE" badge. Both are on the banned list - the pulse implies live data that
 * is not being measured - so neither survived the move.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, action, sx }) => (
  <Box
    sx={[
      { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2 },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    <Box sx={{ minWidth: 0 }}>
      <Typography
        component="h1"
        variant="h1"
        sx={(t) => ({ fontFamily: t.custom.fontDisplay, color: 'text.primary' })}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography sx={{ mt: 1, color: 'text.secondary', maxWidth: 560 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
    {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
  </Box>
);

export default PageHeader;
