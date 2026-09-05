import React from 'react';
import { Box, Tooltip, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { BRAND } from '../theme';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import type { PlanId } from './types';

interface ProPillProps {
  onClick: () => void;
}

/**
 * The one place in the shell that says Pro exists.
 *
 * ## Why it is ink and not coral
 *
 * This was a coral tint with coral type, and it had to be faint: "Plan a trip"
 * sits immediately to its right as a solid coral fill, and two coral buttons in
 * one cluster means neither is primary. Staying quiet was the only way to stay
 * out of the primary action's way *while staying coral*.
 *
 * Measured, that compromise had gone too far. The fill was 1.13:1 against the
 * header behind it, so it barely read as a shape at all, and the label was
 * 3.12:1 on its own tint, under the 4.5 bar. Not noticeable and not legible
 * were the same defect.
 *
 * The trap was the hue rather than the volume. A neutral marker cannot compete
 * with a coral action however loud it gets, so it can take all the contrast it
 * wants: 17.35:1 in light, 17.56:1 in dark.
 *
 * This is not a new invention. The landing page already marks the Pro plan with
 * an ink pill, and FilterChip, SegmentedControl and CardTypeTag all use the same
 * fill. CardTypeTag states the rank outright: coral, then near-black, then grey,
 * ordered by darkness. This pill was the only paid-tier marker in the app not
 * speaking that language.
 *
 * ## Two faces
 *
 * Always shown. On the free plan it invites, on Pro it confirms; hiding it once
 * somebody subscribes would remove the only way back to what they are paying
 * for. Free is the ink fill. Pro drops to a hairline and coral type, matching
 * how /pricing already marks the plan you are on, because a control has no
 * business selling to somebody who has already bought.
 *
 * Both read `text.primary` and `background.paper`, which swap together, so dark
 * mode inverts to an ivory pill rather than vanishing into a near-black header
 * the way a hardcoded graphite would.
 *
 * ## Why there is no glyph
 *
 * It carried a sparkle. In this codebase a sparkle means four unrelated things -
 * Navia actions, premium, the planner's "Simple" density toggle, and the
 * profile passport's fallback for a highlight with no icon mapped - so it
 * carries no meaning of its own here. It is not Navia's mark either; Navia is
 * the orb.
 *
 * More to the point, the two surfaces that actually take money carry no glyph:
 * PricingPage imports one icon and it is a checkmark, and the landing table
 * marks its featured plan with plain text. Dropping it moves this pill toward
 * how the product sells rather than away from it.
 *
 * The word does the work. Adding an ornament beside a label that is already
 * unambiguous is how a control starts looking generated.
 */
const ProPill: React.FC<ProPillProps> = ({ onClick }) => {
  const theme = useTheme();
  const { token } = useAuthToken();
  const [planId, setPlanId] = React.useState<PlanId | null>(null);

  React.useEffect(() => {
    if (!token) { setPlanId(null); return; }
    let active = true;
    // Through the resolver, not the profile column: a lapsed subscription still
    // reads as Pro on the profile and must not show a Pro badge here.
    apiServices.getMyPlan(token)
      .then((r) => { if (active) setPlanId(r.data?.planId ?? null); })
      .catch(() => { if (active) setPlanId(null); });
    return () => { active = false; };
  }, [token]);

  const onPro = planId === 'pro';
  /*
   * "Upgrade" rather than "Get Pro" on the free face.
   *
   * It names the action instead of the product, which is what a button should
   * do, and it needs no prior knowledge of the tier names to be understood. The
   * dialog it opens says "Tripician Pro" immediately, so nothing is lost by the
   * button not saying it.
   *
   * The accessible name below stays descriptive on purpose: a screen reader
   * announcing a bare "Upgrade" with no object is worse than the visible label,
   * which has the whole header for context.
   */
  const label = onPro ? 'Pro' : 'Upgrade';

  /*
   * Coral type, but not `primary.main`.
   *
   * The brand fill is a fill: at label sizes it does not clear AA on a light
   * surface, which is the exact reason these two tones exist. On paper they
   * measure 4.93:1 light and 5.23:1 dark.
   */
  const proInk = theme.palette.mode === 'light'
    ? theme.custom.brand.onLight
    : theme.custom.brand.onDark;

  return (
    <Tooltip title={onPro ? 'Your plan, and what Business adds' : 'What Tripician Pro adds'} arrow>
      <Box
        component="button"
        type="button"
        onClick={onClick}
        aria-label={onPro ? 'Your Tripician Pro plan' : 'See what Tripician Pro adds'}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          flexShrink: 0,
          height: 36,
          // Wider than it was, because a lone word needs room around it. With a
          // glyph beside it the icon did that job; without one, the padding has to.
          px: { xs: 1.5, sm: 1.75 },
          borderRadius: '50px',
          cursor: 'pointer',
          fontFamily: 'inherit',
          // On the scale rather than an ad-hoc size, and heavier than the step's
          // own weight because this is a control, not running text.
          typography: 'subtitle2',
          fontWeight: 700,
          letterSpacing: '0.01em',
          color: onPro ? proInk : 'background.paper',
          bgcolor: onPro ? 'background.paper' : 'text.primary',
          border: onPro ? `1px solid ${alpha(BRAND.coral, 0.45)}` : '1px solid transparent',
          transition: `background-color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard},
                       box-shadow ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
          /*
           * Hover is a ring, never a halo.
           *
           * A brand-coloured shadow with a blur radius behind a button is the
           * loudest generated-UI tell there is, and the theme has a guard that
           * fails the build over it. ringBrand is the sanctioned form: it sits
           * hard on the edge and spreads no light. It also ties the pill back to
           * the brand on interaction without adding a second coral fill.
           */
          '&:hover': {
            boxShadow: theme.custom.shadows.ringBrand,
            bgcolor: onPro ? theme.custom.surface.hover : 'text.primary',
          },
          '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
        }}
      >
        {label}
      </Box>
    </Tooltip>
  );
};

export default ProPill;
