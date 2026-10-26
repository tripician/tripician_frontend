/**
 * Verified Profile: Tripician's own team reviewed this person's whole profile
 * and is willing to vouch for them, not just for one trip or one KYC check.
 *
 * A third mark, deliberately distinct from the two "Verified" marks this
 * codebase already has, because nobody should ever see two different
 * "Verified" glyphs and wonder which one this is:
 *
 *   IdentityVerifiedMark  "this account passed an automated KYC check" - a fact
 *                         about the account, checked by a webhook, lives on the
 *                         avatar corner and never becomes a pill next to a title
 *                         (per that component's own doc comment).
 *   VerifiedTripBadge     "our team reviewed this one itinerary" - an editorial
 *                         judgement about a trip, granted by hand, blue rosette,
 *                         inline next to that trip's heading.
 *   this mark             "our team reviewed this person's whole profile" - also
 *                         granted by hand, but about the account rather than a
 *                         trip, requested from Settings or set directly from the
 *                         admin portal.
 *
 * **The shape everyone already reads as "verified"**: a scalloped badge with a
 * white tick, the Instagram idiom. An earlier version used `IconCertificate` to
 * look unlike its siblings, but nobody outside this codebase reads a
 * certificate as "verified" - the convention customers already know wins over
 * a glyph they would have to learn. Drawn here rather than taken from Tabler so
 * the tick is a real white stroke: `IconRosetteDiscountCheckFilled` knocks the
 * tick out, so it shows whatever is behind it and turns dark on a dark card.
 * **Brand red**, which is what separates it from the blue trip rosette and the
 * blue identity marks. VerifiedTripBadge avoids coral because it is "the
 * everywhere-colour" on a trip card; this mark is Tripician vouching for the
 * person, so the platform's own colour is the right one - the same red as the
 * Follow button. Always through the `primary.main` token, never a hardcoded
 * hex, so `colour-literal.guard.test.ts` stays green.
 * **Inline, next to the name**, mirroring VerifiedTripBadge's shape - never the
 * avatar corner, which IdentityVerifiedMark's own doc comment reserves for
 * itself.
 *
 * Returns null when not verified, so call sites stay unconditional.
 */

import React from 'react';
import { Box, Tooltip } from '@mui/material';

interface VerifiedProfileMarkProps {
  verified?: boolean;
  /** ISO timestamp. Adds "since {Month Year}" to the tooltip when present. */
  verifiedAt?: string | null;
  /** Badge size in px. 16 suits body text; go larger next to a page-title name. */
  size?: number;
}

/**
 * The scalloped outline: eight rounded lobes on a 24-unit box, built once from a
 * polar wave rather than copied from another product's asset. 96 samples is
 * smooth at every size this renders at.
 */
const BADGE_PATH = (() => {
  const steps = 96;
  const points = Array.from({ length: steps }, (_, i) => {
    const t = (i / steps) * Math.PI * 2;
    const r = 10.6 + 0.9 * Math.cos(8 * t);
    return `${(12 + r * Math.sin(t)).toFixed(2)} ${(12 - r * Math.cos(t)).toFixed(2)}`;
  });
  return `M${points.join('L')}Z`;
})();

/**
 * Month and year only, same reasoning as VerifiedTripBadge's own formatter: the
 * exact day is noise for a review, and the coarser grain ages better.
 */
function formatVerifiedOn(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

const VerifiedProfileMark: React.FC<VerifiedProfileMarkProps> = ({ verified, verifiedAt, size = 16 }) => {
  if (!verified) return null;

  const on = formatVerifiedOn(verifiedAt);
  const tooltip = on ? `Verified Profile since ${on}` : 'Verified Profile';

  return (
    <Tooltip title={tooltip} arrow placement="top">
      <Box
        component="span"
        aria-label="Verified Profile"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          // Never let a long name squeeze the mark out of view.
          flexShrink: 0,
          lineHeight: 0,
          color: 'primary.main',
        }}
      >
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path d={BADGE_PATH} fill="currentColor" />
          <path
            d="M7.6 12.4l2.9 2.9 5.9-6"
            fill="none"
            stroke="#fff"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Box>
    </Tooltip>
  );
};

export default VerifiedProfileMark;
