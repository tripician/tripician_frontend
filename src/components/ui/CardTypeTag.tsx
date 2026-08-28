import React from 'react';
import { Box, Tooltip, useTheme } from '@mui/material';
import { CARD_TYPES } from './cardTypes';
import type { CardTypeKind } from './cardTypes';

/**
 * The bookmark that says what a card IS.
 *
 * Trips, stories and posts share feeds now, and the three cards were relying on
 * silhouette alone to tell them apart. That works at a glance on a wide grid and
 * fails everywhere else: in a rail, on a phone, and for anybody who has not used
 * the product before.
 *
 * A ribbon over the top-right corner rather than a pill in the flow, because it
 * labels the whole card rather than qualifying a line of text inside it. The
 * notch at the foot is what makes it read as a bookmark rather than as a
 * coloured rectangle stuck to the corner.
 *
 * Tone carries as much of the meaning as the icon: a plan is brand coral, a
 * story is ink, everything else is quiet. Somebody scanning a mixed feed can
 * separate the two main kinds without reading a word.
 *
 * The vocabulary itself lives in cardTypes.ts, shared with the activity rail.
 */

interface CardTypeTagProps {
  kind: CardTypeKind;
  /** Distance from the right edge. Nudged where something else sits in the corner. */
  right?: number;
}

const CardTypeTag: React.FC<CardTypeTagProps> = ({ kind, right = 12 }) => {
  const theme = useTheme();
  const spec = CARD_TYPES[kind];

  /*
   * All three tones are solid fills, and the hierarchy is carried by how dark
   * each one is: coral, then near-black, then a mid grey.
   *
   * Quiet used to be `background.paper` with a hairline, which was designed to
   * sit on a photograph. On a card WITHOUT one it was a white bookmark on a
   * white card, visible only as a faint outline, so the kinds that need the
   * label most were the ones you could not read. A filled grey works on both.
   */
  const palette = {
    brand: { bg: theme.palette.primary.main, fg: theme.palette.primary.contrastText },
    ink: { bg: theme.palette.text.primary, fg: theme.palette.background.paper },
    quiet: { bg: theme.palette.text.secondary, fg: theme.palette.background.paper },
  }[spec.tone];

  return (
    <Tooltip title={spec.label} arrow placement="left">
      <Box
        aria-label={spec.label}
        sx={{
          position: 'absolute',
          top: 0,
          right,
          zIndex: 2,
          width: 26,
          height: 34,
          display: 'grid',
          placeItems: 'center',
          // The notch is cut from the bottom, so the glyph sits above it.
          pb: 0.5,
          color: palette.fg,
          bgcolor: palette.bg,
          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)',
          pointerEvents: 'none',
        }}
      >
        <spec.Icon size={13} stroke={2} />
      </Box>
    </Tooltip>
  );
};

export default CardTypeTag;
