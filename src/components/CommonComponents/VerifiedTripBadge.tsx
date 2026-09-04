import React from 'react';
import { Box, Tooltip } from '@mui/material';
import { IconRosetteDiscountCheckFilled } from '@tabler/icons-react';

/**
 * Tripician Verified: a person on the team read this itinerary and the platform is
 * willing to put its name on it.
 *
 * ## Why this looks nothing like ProvenanceChip
 *
 * `ProvenanceChip` also says "Verified", and on a trip page both can be on screen at
 * once: this badge beside the title, that chip beside individual places further down.
 * They mean genuinely different things, so they must not be mistakable for each
 * other:
 *
 *   ProvenanceChip  "this place resolved to a real listing that is currently open"
 *   this badge      "our team reviewed this whole itinerary"
 *
 * Three deliberate separations. **Blue**, because green is provenance's colour, and
 * coral is already the everywhere-colour on these cards (like button, primary CTA,
 * avatar fallback) so a coral glyph after a title would not read as a distinct mark.
 * A **filled rosette**, not the outline circle-check provenance owns. And
 * **wordless**, which is the platform-endorsement idiom people already read, and
 * which means it cannot be confused with the literal word "Verified" sitting beside
 * a place lower down the same page.
 *
 * Returns null when the trip is not verified, so call sites stay unconditional.
 */

/** Tripician blue. Not the coral brand accent, and not provenance green, on purpose. */
const VERIFIED_BLUE = '#0EA5E9';
/** Same hue at card-chrome weight. Literal rgba so it needs no theme to resolve. */
const VERIFIED_BLUE_TINT = 'rgba(14,165,233,0.12)';

interface VerifiedTripBadgeProps {
  verified?: boolean;
  /** ISO timestamp. Adds "Verified {Month Year}" to the tooltip when present. */
  verifiedAt?: string | null;
  /**
   * 'inline' is the wordless mark that sits after a heading; 'hero' is the same
   * mark at page-title size; 'pill' spells the endorsement out beside a card
   * title, where there is no surrounding context to infer it from and a reader
   * scanning a grid will not stop to hover a bare glyph.
   */
  variant?: 'inline' | 'hero' | 'pill';
}

/**
 * Month and year only. The exact day is noise for an editorial review, and a coarser
 * grain ages better: "Verified March 2026" stays readable a year later in a way that
 * "Verified 3 Mar 2026" does not.
 */
function formatVerifiedOn(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

const VerifiedTripBadge: React.FC<VerifiedTripBadgeProps> = ({ verified, verifiedAt, variant = 'inline' }) => {
  if (!verified) return null;

  const on = formatVerifiedOn(verifiedAt);
  const tooltip = `Tripician Verified. Our team reviewed this itinerary${on ? `, ${on}` : ''}.`;

  if (variant === 'pill') {
    return (
      <Tooltip title={tooltip} arrow placement="top">
        <Box
          component="span"
          aria-label="Tripician Verified trip"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.4,
            // Never let a long title squeeze the endorsement out of view.
            flexShrink: 0,
            whiteSpace: 'nowrap',
            px: 0.75,
            py: 0.25,
            borderRadius: 999,
            bgcolor: VERIFIED_BLUE_TINT,
            color: VERIFIED_BLUE,
            typography: 'caption',
            fontWeight: 700,
            lineHeight: 1.5,
          }}
        >
          <IconRosetteDiscountCheckFilled size={13} />
          Tripician Verified
        </Box>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={tooltip} arrow placement="top">
      <Box
        component="span"
        aria-label="Tripician Verified trip"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          // Never let a long title squeeze the badge out of view.
          flexShrink: 0,
          lineHeight: 0,
          color: VERIFIED_BLUE,
        }}
      >
        <IconRosetteDiscountCheckFilled size={variant === 'hero' ? 22 : 16} />
      </Box>
    </Tooltip>
  );
};

export default VerifiedTripBadge;
