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
 * Three deliberate choices keep it from being mistaken for either sibling.
 * **Brand coral**, which is the one departure from VerifiedTripBadge's own
 * reasoning - that badge avoids coral because it is already "the everywhere-
 * colour" on a trip card. This mark is not competing with card chrome: it is
 * Tripician's own endorsement of the person, so the platform's own colour is
 * the right one, and it is literally what prompted this mark to be built - the
 * same red as the Follow button. Always through the `primary.main` token, never
 * a hardcoded hex, so `colour-literal.guard.test.ts` stays green.
 * **`IconCertificate`**, not `IconCheck` (identity's plain tick) or
 * `IconRosetteDiscountCheckFilled` (the trip badge's filled rosette, already
 * duplicated inline for identity on post cards) - a document-and-seal shape
 * neither of those is.
 * **Inline, next to the name**, mirroring VerifiedTripBadge's shape - never the
 * avatar corner, which IdentityVerifiedMark's own doc comment reserves for
 * itself.
 *
 * Returns null when not verified, so call sites stay unconditional.
 */

import React from 'react';
import { Box, Tooltip } from '@mui/material';
import { IconCertificate } from '@tabler/icons-react';

interface VerifiedProfileMarkProps {
  verified?: boolean;
  /** ISO timestamp. Adds "since {Month Year}" to the tooltip when present. */
  verifiedAt?: string | null;
}

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

const VerifiedProfileMark: React.FC<VerifiedProfileMarkProps> = ({ verified, verifiedAt }) => {
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
        <IconCertificate size={16} />
      </Box>
    </Tooltip>
  );
};

export default VerifiedProfileMark;
