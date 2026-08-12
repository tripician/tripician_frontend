import React from 'react';
import { Box, Popper, Button, Typography, IconButton } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX, IconChevronLeft } from '@tabler/icons-react';
import { PLANNER_TOUR_STEPS, type PlannerTourStep } from './plannerTourSteps';
import { markPlannerTourSeen, markWalkthroughShown } from '../../utils/walkthroughCoordinator';

interface PlannerTourProps {
  /**
   * Controlled open state. The parent owns this so the help button can replay the
   * tour, and so the parent can hold it back while a full-screen overlay is up.
   */
  open: boolean;
  onClose: () => void;
}

interface Rect { top: number; left: number; width: number; height: number }

const SPOTLIGHT_PAD = 6;

function readRect(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return {
    top: r.top - SPOTLIGHT_PAD,
    left: r.left - SPOTLIGHT_PAD,
    width: r.width + SPOTLIGHT_PAD * 2,
    height: r.height + SPOTLIGHT_PAD * 2,
  };
}

const findTarget = (step: PlannerTourStep): HTMLElement | null => {
  try {
    const el = document.querySelector<HTMLElement>(`[data-tour="${CSS.escape(step.target)}"]`);
    if (!el) return null;
    // An element that is present but not laid out (a hidden breakpoint variant, or
    // a collapsed panel) is as good as absent - highlighting a 0x0 box points at
    // nothing. This is what makes Simple-mode steps drop out cleanly.
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return null;
    return el;
  } catch {
    return null;
  }
};

/**
 * First-run spotlight tour for the trip planner.
 *
 * A dim overlay with a hole punched over the current target, plus a bubble anchored
 * to it. Built on MUI's `Popper` and a `box-shadow` cut-out rather than a tour
 * library - no dependency was needed for this, and the planner's own controls are
 * the only thing worth pointing at.
 *
 * The load-bearing behaviour is in `visibleSteps`: any step whose target is missing
 * or unlaid-out is filtered out before the tour starts. That is what keeps the deck
 * honest across Simple and Advanced mode without either mode being named here.
 */
const PlannerTour: React.FC<PlannerTourProps> = ({ open, onClose }) => {
  const [index, setIndex] = React.useState(0);
  const [steps, setSteps] = React.useState<PlannerTourStep[]>([]);
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const [rect, setRect] = React.useState<Rect | null>(null);

  /**
   * Resolve the deck once per opening, so a mode switch mid-tour can't reshuffle
   * the steps under the user.
   *
   * No breakpoint gate: the anchor filter already handles small screens. On a
   * phone the Publish and Reality-check controls are not rendered at all, so those
   * steps drop out on their own, and the map step resolves to the floating map
   * button instead of the desktop rail. That is the same mechanism that makes the
   * deck mode-aware, doing double duty.
   */
  React.useEffect(() => {
    if (!open) { setSteps([]); return; }
    setSteps(PLANNER_TOUR_STEPS.filter(s => findTarget(s) !== null));
    setIndex(0);
  }, [open]);

  const step = steps[index];

  // Track the current target: scroll it into view, then keep the spotlight glued to
  // it through scrolling and resizing.
  React.useEffect(() => {
    if (!open || !step) { setAnchor(null); setRect(null); return; }

    const el = findTarget(step);
    if (!el) {
      // Vanished since the deck was resolved (a panel collapsed, say) - step past it
      // rather than spotlighting nothing.
      setIndex(i => (i + 1 < steps.length ? i + 1 : i));
      return;
    }

    setAnchor(el);
    try { el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); } catch { /* older browsers */ }

    const sync = () => setRect(readRect(el));
    sync();
    // A beat for the smooth scroll to land before the final measurement.
    const settle = window.setTimeout(sync, 320);

    window.addEventListener('scroll', sync, true);
    window.addEventListener('resize', sync);
    return () => {
      window.clearTimeout(settle);
      window.removeEventListener('scroll', sync, true);
      window.removeEventListener('resize', sync);
    };
  }, [open, step, steps.length]);

  // Claim the session slot the moment we actually appear, so the dashboard
  // carousel stands down. Marked on display, never on request.
  const claimedRef = React.useRef(false);
  React.useEffect(() => {
    if (open && step && !claimedRef.current) {
      claimedRef.current = true;
      markWalkthroughShown('plannerTour');
    }
    if (!open) claimedRef.current = false;
  }, [open, step]);

  const finish = React.useCallback(() => {
    markPlannerTourSeen();
    onClose();
  }, [onClose]);

  const isLast = index === steps.length - 1;
  const next = React.useCallback(() => {
    if (isLast) finish();
    else setIndex(i => i + 1);
  }, [isLast, finish]);
  const back = React.useCallback(() => setIndex(i => Math.max(0, i - 1)), []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); finish(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); back(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, finish, next, back]);

  // Nothing to point at (wrong breakpoint, or the board hasn't rendered) - say
  // nothing rather than dimming the screen for an empty tour.
  if (!open || !step || !rect) return null;

  return (
    <>
      {/* Dim everything except the target. One element, one box-shadow: no four-div
          scrim, and the lit area stays perfectly aligned with the rect. */}
      <Box
        component={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={finish}
        sx={{ position: 'fixed', inset: 0, zIndex: 1500, cursor: 'pointer' }}
        aria-hidden
      >
        <Box
          sx={{
            position: 'fixed',
            top: rect.top, left: rect.left, width: rect.width, height: rect.height,
            borderRadius: '12px',
            boxShadow: '0 0 0 9999px rgba(12,12,16,0.62)',
            // Pointer events off so the lit control is still clickable, and the
            // click-to-dismiss on the parent doesn't fire from inside the hole.
            pointerEvents: 'none',
            transition: 'top .22s ease, left .22s ease, width .22s ease, height .22s ease',
          }}
        />
      </Box>

      <Popper
        open
        anchorEl={anchor}
        placement={step.placement ?? 'bottom'}
        modifiers={[
          { name: 'offset', options: { offset: [0, 14] } },
          { name: 'preventOverflow', options: { padding: 12 } },
          { name: 'flip', options: { padding: 12 } },
        ]}
        sx={{ zIndex: 1600 }}
      >
        <AnimatePresence mode="wait">
          <Box
            key={step.target}
            component={motion.div}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-modal="false"
            aria-label={`Tour step ${index + 1} of ${steps.length}: ${step.title}`}
            sx={(t) => ({
              width: { xs: 300, sm: 340 },
              p: 2,
              borderRadius: '16px',
              bgcolor: 'background.paper',
              border: `1px solid ${t.custom.surface.border}`,
              boxShadow: t.custom.shadows.overlay,
            })}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.75 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="overline" sx={{ color: 'text.disabled', display: 'block', lineHeight: 1.4 }}>
                  {index + 1} of {steps.length}
                </Typography>
                <Typography variant="subtitle1" sx={{ lineHeight: 1.3 }}>
                  {step.title}
                </Typography>
              </Box>
              <IconButton size="small" onClick={finish} aria-label="Close tour" sx={{ color: 'text.disabled', mt: -0.5, mr: -0.5 }}>
                <IconX size={16} />
              </IconButton>
            </Box>

            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.55 }}>
              {step.body}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
              {/* Skip is present on every step, not just the first: someone who wants
                  out on step 5 should not have to click Next three more times. */}
              <Button
                size="small"
                onClick={finish}
                sx={{ textTransform: 'none', fontSize: 12.5, color: 'text.secondary', px: 0.5, minWidth: 0 }}
              >
                Skip tour
              </Button>
              <Box sx={{ flex: 1 }} />
              {index > 0 && (
                <IconButton size="small" onClick={back} aria-label="Previous step" sx={{ color: 'text.secondary' }}>
                  <IconChevronLeft size={16} />
                </IconButton>
              )}
              <Button
                size="small"
                variant="contained"
                onClick={next}
                sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 700, borderRadius: 999, px: 2 }}
              >
                {isLast ? 'Start planning' : 'Next'}
              </Button>
            </Box>
          </Box>
        </AnimatePresence>
      </Popper>
    </>
  );
};

export default PlannerTour;
