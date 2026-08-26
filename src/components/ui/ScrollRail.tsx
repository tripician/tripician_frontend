import React from 'react';
import { Box, IconButton, useTheme } from '@mui/material';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

interface ScrollRailProps {
  children: React.ReactNode;
  /** Gap between items, in theme spacing units. */
  gap?: number;
  ariaLabel?: string;
}

/**
 * A horizontal row you can actually move.
 *
 * The rails on this product hid their scrollbars for looks and then offered
 * nothing in their place, so on a desktop with a mouse the content past the
 * right edge was simply unreachable: a trackpad swipe works, a wheel does not,
 * and there was no control to press.
 *
 * Three ways out, because different people reach for different ones: arrows on
 * a pointer device, the wheel translated to horizontal, and the native swipe on
 * touch. The arrows appear only when there is something to scroll to, and each
 * one hides at its own end rather than sitting there disabled.
 */
const ScrollRail: React.FC<ScrollRailProps> = ({ children, gap = 1.5, ariaLabel }) => {
  const theme = useTheme();
  const ref = React.useRef<HTMLDivElement>(null);
  const childCount = React.Children.count(children);
  // Both start true so no arrow flashes before the first measurement, and a row
  // whose content fits never grows one at all.
  const [atStart, setAtStart] = React.useState(true);
  const [atEnd, setAtEnd] = React.useState(true);

  const measure = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // A pixel of slack: fractional widths mean scrollLeft rarely lands exactly
    // on the maximum, which would leave the right arrow showing forever.
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }, []);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    // Children arriving later (an image loading, a fetch resolving) change the
    // scroll width without any scroll or resize event of their own.
    for (const child of Array.from(el.children)) observer.observe(child);

    return () => observer.disconnect();
    // Keyed on the child COUNT, not on `children` itself. The children object is
    // new on every render, which would tear down and rebuild the observer each
    // time for no reason.
  }, [measure, childCount]);

  const scrollBy = (direction: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    // Most of a screenful, not all of it: leaving one card visible is what tells
    // the reader the row moved rather than jumped somewhere else.
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  /*
   * A native listener, not React's onWheel.
   *
   * React registers `wheel` at the root as PASSIVE, so preventDefault inside a
   * JSX handler silently does nothing and Chrome logs a warning about it. The
   * only way to stop the page scrolling underneath is to attach it here with
   * `passive: false`.
   */
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // A trackpad already sends deltaX, and hijacking that would fight the
      // gesture. This is only for a plain wheel, which sends deltaY alone.
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;

      const next = el.scrollLeft + e.deltaY;
      // Only swallow the page scroll while this row can still move. Past either
      // end the page must keep scrolling, or a rail becomes a trap.
      if (next > 0 && next < max) e.preventDefault();
      el.scrollLeft = next;
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const arrowSx = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 2,
    width: 34,
    height: 34,
    bgcolor: 'background.paper',
    border: `1px solid ${theme.custom.surface.border}`,
    color: 'text.primary',
    boxShadow: theme.custom.shadows.card,
    display: { xs: 'none', md: 'inline-flex' },
    '&:hover': { bgcolor: 'background.paper', borderColor: 'text.disabled' },
  } as const;

  return (
    <Box sx={{ position: 'relative' }}>
      {!atStart && (
        <IconButton aria-label="Scroll left" onClick={() => scrollBy(-1)} sx={{ ...arrowSx, left: -14 }}>
          <IconChevronLeft size={18} />
        </IconButton>
      )}

      <Box
        ref={ref}
        role="group"
        aria-label={ariaLabel}
        onScroll={measure}
        sx={{
          display: 'flex',
          gap,
          overflowX: 'auto',
          // Padding, not margin: a focus ring on the first card would otherwise
          // be clipped by the scroll container.
          py: 1,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          scrollSnapType: { xs: 'x proximity', md: 'none' },
          '& > *': { scrollSnapAlign: 'start' },
        }}
      >
        {children}
      </Box>

      {!atEnd && (
        <IconButton aria-label="Scroll right" onClick={() => scrollBy(1)} sx={{ ...arrowSx, right: -14 }}>
          <IconChevronRight size={18} />
        </IconButton>
      )}
    </Box>
  );
};

export default ScrollRail;
