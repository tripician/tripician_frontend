import React from 'react';
import { Box } from '@mui/material';

interface ChipRailProps {
  children: React.ReactNode;
  gap?: number;
  sx?: object;
}

/**
 * A row of chips that wraps on a desktop and swipes on a phone.
 *
 * It replaces `hiddenScrollbarSx`, which set `overflowX: auto` and then hid the
 * scrollbar. That works with a finger and fails with a mouse: a horizontally
 * overflowing box does not respond to a vertical wheel, so on a desktop the
 * chips past the fold were simply unreachable. Adding arrows would have solved
 * the symptom; wrapping removes the overflow.
 *
 * Below `md` it still scrolls, because vertical space on a phone is worth more
 * than the two taps of a second row, and swiping there is a real gesture rather
 * than a workaround.
 */
const ChipRail: React.FC<ChipRailProps> = ({ children, gap = 1, sx }) => (
  <Box
    sx={{
      display: 'flex',
      gap,
      // Wrap where there is width for a second line, scroll where there is not.
      flexWrap: { xs: 'nowrap', md: 'wrap' },
      overflowX: { xs: 'auto', md: 'visible' },
      // Clears the descender of a chip's focus ring on the scrolling variant.
      pb: { xs: 0.5, md: 0 },
      '::-webkit-scrollbar': { display: 'none' },
      scrollbarWidth: 'none',
      ...sx,
    }}
  >
    {children}
  </Box>
);

export default ChipRail;
