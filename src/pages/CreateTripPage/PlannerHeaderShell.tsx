/**
 * The band under the TopBar, shared by both planner modes.
 *
 * Simple and Advanced render completely different content here - a guidance
 * sentence versus a row of vitals pills - and each used to own its own sticky
 * positioning, border, background and content column. They had already drifted:
 * one sat on `background.default` and the other on a translucent blur, and only
 * one carried the `backdropFilter`, so switching mode changed the physics of the
 * page as well as its contents.
 *
 * Only the shell lives here. What goes inside stays with each mode, because the
 * two genuinely say different things.
 *
 * INVARIANT: `px` must equal `DestinationCardsPanel`'s root padding at every
 * breakpoint, or the header text and the stop cards land on two different left
 * edges. Change one, change the other. The 900px inner column is the same one
 * the stop cards use, which is what keeps the mode switch on an identical x in
 * both modes - it used to jump across the screen every time you pressed it.
 */

import React from 'react';
import { Box } from '@mui/material';

/** The content column every planner surface shares. */
export const PLANNER_COLUMN_MAX = 900;
/** Must match DestinationCardsPanel's root px. */
export const PLANNER_COLUMN_PX = { xs: 2, sm: 2.5 } as const;

export interface PlannerHeaderShellProps {
  children: React.ReactNode;
  /** Simple needs more air for its two-line text block than Advanced's pill row. */
  dense?: boolean;
}

const PlannerHeaderShell: React.FC<PlannerHeaderShellProps> = ({ children, dense = false }) => (
  <Box
    sx={(t) => ({
      px: PLANNER_COLUMN_PX,
      py: dense ? 0.75 : { xs: 1.75, sm: 2.25 },
      borderBottom: `1px solid ${t.custom.surface.border}`,
      bgcolor: 'background.default',
      position: 'sticky',
      top: 0,
      zIndex: 2,
    })}
  >
    <Box
      sx={{
        maxWidth: PLANNER_COLUMN_MAX,
        mx: 'auto',
        width: '100%',
        display: 'flex',
        // Stacks on a phone. Side by side, the controls cluster claims ~260px of a
        // 390px viewport, which squeezed Simple's text column to ~115px: the facts
        // kicker broke onto three lines and the guidance sentence onto four.
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' },
        flexWrap: dense ? { xs: 'wrap', md: 'nowrap' } : 'nowrap',
        rowGap: 0.75,
        gap: { xs: 1.25, sm: dense ? 1 : 2 },
      }}
    >
      {children}
    </Box>
  </Box>
);

export default PlannerHeaderShell;
