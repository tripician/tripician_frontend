import React, { useCallback, useEffect, useState } from 'react';
import { Box, Modal, IconButton, Button, Typography, useTheme } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { ONBOARDING_SLIDES } from './onboardingSlides';
import { markWalkthroughShown, walkthroughShownThisSession } from '../../utils/walkthroughCoordinator';

const SEEN_KEY = 'tripician:onboardingSeen';

/** True once, ever, per browser - matches the naviaGroupHint one-time-hint pattern. */
function hasSeenOnboarding(): boolean {
  try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return true; }
}
function markOnboardingSeen(): void {
  try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* private mode - shows again next visit, acceptable */ }
}

/**
 * First-run feature tour for new users: 3 slides, self-paced (no autoplay - an
 * onboarding message that vanishes before it's read is worse than one the user
 * skips), dismissible from any slide, gated to show once ever per browser.
 *
 * Mounted unconditionally in NavigationPanel; the component decides for itself
 * whether to render by checking localStorage on mount. A short delay before
 * opening lets the app shell paint first, so it doesn't compete with layout
 * shift on the very first frame.
 */
const OnboardingCarousel: React.FC = () => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    if (hasSeenOnboarding()) return;
    // Stand down if the planner tour already ran this session - a new user should
    // not get two walkthroughs back to back. This deck keeps its own once-ever
    // flag unburned, so it simply appears on a later visit instead.
    if (walkthroughShownThisSession()) return;
    const t = setTimeout(() => {
      markWalkthroughShown('appCarousel');
      setOpen(true);
    }, 500);
    return () => clearTimeout(t);
  }, []);

  const dismiss = useCallback(() => {
    markOnboardingSeen();
    setOpen(false);
  }, []);

  const goTo = useCallback((next: number) => {
    setDirection(next > index ? 1 : -1);
    setIndex(Math.max(0, Math.min(ONBOARDING_SLIDES.length - 1, next)));
  }, [index]);

  const isLast = index === ONBOARDING_SLIDES.length - 1;
  const slide = ONBOARDING_SLIDES[index];

  const handleCreateTrip = useCallback(() => {
    markOnboardingSeen();
    setOpen(false);
    // Same event NavigationPanel's header/nav "Create trip" buttons dispatch -
    // opens the real trip-creation flow rather than a route of its own.
    window.dispatchEvent(new Event('trip:create'));
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' && !isLast) goTo(index + 1);
    else if (e.key === 'ArrowLeft' && index > 0) goTo(index - 1);
    else if (e.key === 'Escape') dismiss();
  }, [index, isLast, goTo, dismiss]);

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={dismiss}
      keepMounted={false}
      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 1, sm: 2 } }}
    >
      <Box
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to Tripician"
        sx={{
          width: { xs: '96vw', sm: 460 },
          maxWidth: '96vw',
          bgcolor: 'background.paper',
          borderRadius: '20px',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: theme.custom?.shadows?.overlay ?? '0 32px 80px rgba(0,0,0,0.24)',
          overflow: 'hidden',
          outline: 'none',
        }}
      >
        {/* Image */}
        <Box sx={{ position: 'relative', height: 220, overflow: 'hidden', bgcolor: theme.custom?.surface?.active }}>
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.img
              key={slide.slug}
              src={slide.image}
              alt={slide.alt}
              custom={direction}
              initial={{ opacity: 0, x: direction * 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -32 }}
              transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </AnimatePresence>
          <Box sx={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.02) 55%, rgba(0,0,0,0.55) 100%)',
          }} />

          {/* Dismiss - available on every slide so no one is trapped in the tour */}
          <IconButton
            onClick={dismiss}
            aria-label="Close"
            size="small"
            sx={{
              position: 'absolute', top: 10, right: 10,
              bgcolor: 'rgba(0,0,0,0.35)', color: '#fff',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.55)' },
            }}
          >
            <IconX size={16} />
          </IconButton>

          {/* Dots, clickable */}
          <Box sx={{ position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 0.75 }}>
            {ONBOARDING_SLIDES.map((s, i) => (
              <Box
                key={s.slug}
                component="button"
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                sx={{
                  width: i === index ? 18 : 6, height: 6, borderRadius: 999, border: 'none', p: 0, cursor: 'pointer',
                  bgcolor: i === index ? '#fff' : 'rgba(255,255,255,0.5)',
                  transition: `width ${theme.custom?.motion?.duration?.base ?? '200ms'} ease, background-color 150ms ease`,
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Copy */}
        <Box sx={{ p: { xs: 2.5, sm: 3 }, minHeight: 148, display: 'flex', flexDirection: 'column' }}>
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={slide.slug}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
            >
              <Typography sx={{
                fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'primary.main', mb: 0.75,
              }}>
                {slide.eyebrow}
              </Typography>
              <Typography sx={{
                fontFamily: theme.custom.fontDisplay,
                fontWeight: 700, fontSize: '1.28rem', lineHeight: 1.22, letterSpacing: '-0.01em',
                color: 'text.primary', mb: 1,
              }}>
                {slide.title}
              </Typography>
              <Typography sx={{ fontSize: '0.86rem', lineHeight: 1.55, color: 'text.secondary' }}>
                {slide.body}
              </Typography>
            </motion.div>
          </AnimatePresence>

          {/* Footer nav */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto', pt: 2.5 }}>
            <IconButton
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              aria-label="Previous"
              size="small"
              sx={{ color: 'text.secondary', visibility: index === 0 ? 'hidden' : 'visible' }}
            >
              <IconChevronLeft size={18} />
            </IconButton>

            {!isLast ? (
              <Button
                variant="contained"
                onClick={() => goTo(index + 1)}
                endIcon={<IconChevronRight size={16} />}
                sx={{
                  fontWeight: 700, fontSize: '0.84rem', px: 2.5, py: 0.9, borderRadius: '50px', textTransform: 'none',
                  background: theme.custom?.gradients?.brand,
                  '&:hover': { background: theme.custom?.gradients?.brandHover },
                }}
              >
                Next
              </Button>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  onClick={dismiss}
                  sx={{ fontWeight: 600, fontSize: '0.84rem', px: 1.5, textTransform: 'none', color: 'text.secondary' }}
                >
                  Skip
                </Button>
                <Button
                  variant="contained"
                  onClick={handleCreateTrip}
                  sx={{
                    fontWeight: 700, fontSize: '0.84rem', px: 2.5, py: 0.9, borderRadius: '50px', textTransform: 'none',
                    background: theme.custom?.gradients?.brand,
                    '&:hover': { background: theme.custom?.gradients?.brandHover },
                  }}
                >
                  Create trip
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Modal>
  );
};

export default OnboardingCarousel;
