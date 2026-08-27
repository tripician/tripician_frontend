import React from 'react';
import { Box, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Right-aligned slot. Holds a filter, a count, a button, or a whole card. */
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
      {
        display: 'flex',
        /*
         * Row only from `md`, and top-aligned.
         *
         * Both of these were per-page overrides on Community until Trips got the
         * same card and rendered it differently, so the h1 sat at the top of one
         * page and the bottom of the other. The rule belongs here, once.
         *
         * `md`, not `sm`: a card-sized action is still full width between 600 and
         * 899px, and a `width: 100%` child with `flexShrink: 0` in a flex row
         * simply overflows the viewport next to an h1.
         *
         * `flex-start`, not `flex-end`: bottom-aligning was right when this slot
         * held a lone small button, but a tall action pushes the title down by the
         * height difference and opens a dead band above the page's own h1. The
         * heading belongs at the top of the page; the action can hang toward
         * whatever follows, which has its own margin to absorb it. A page whose
         * action is short enough to want the old baseline alignment can still pass
         * `sx={{ alignItems: 'flex-end' }}`, which lands after this block.
         */
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'stretch', md: 'flex-start' },
        justifyContent: 'space-between',
        gap: { xs: 2.5, md: 2 },
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    <Box sx={{ minWidth: 0 }}>
      <Typography
        component="h1"
        variant="h1"
        sx={{ color: 'text.primary' }}
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
