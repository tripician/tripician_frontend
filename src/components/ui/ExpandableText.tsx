import React from 'react';
import { Box, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

/**
 * Body copy that starts clamped and expands in place.
 *
 * Built for the public trip view, where every spot description and every planner
 * note used to render in full - a ten-stop trip was an endless scroll. Clamping
 * keeps the plan scannable while leaving the detail one tap away.
 *
 * Two things it has to get right:
 *  - Spot rows on the trip view are wrapped in an <a> to Google Maps, so the
 *    toggle must swallow the click or expanding would navigate away instead.
 *  - Short text should not show a pointless "more", so the toggle only renders
 *    once we've measured actual overflow.
 */
interface ExpandableTextProps {
  children: string;
  /** Lines shown while collapsed. */
  lines?: number;
  sx?: SxProps<Theme>;
  /** Label for the expand control. */
  moreLabel?: string;
  lessLabel?: string;
}

const ExpandableText: React.FC<ExpandableTextProps> = ({
  children,
  lines = 1,
  sx,
  moreLabel = 'more',
  lessLabel = 'less',
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const [overflows, setOverflows] = React.useState(false);
  const ref = React.useRef<HTMLElement | null>(null);

  // Measure after layout, and again on resize: whether text overflows depends on
  // the column width, which changes between mobile and desktop.
  React.useEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      setOverflows(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [children, lines]);

  const toggle = (e: React.MouseEvent) => {
    // The row around this is often a link; don't let expanding navigate.
    e.preventDefault();
    e.stopPropagation();
    setExpanded(v => !v);
  };

  return (
    <>
      <Typography
        ref={ref as React.Ref<HTMLElement>}
        sx={{
          ...(expanded ? {} : {
            display: '-webkit-box',
            WebkitLineClamp: lines,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }),
          ...sx,
        } as SxProps<Theme>}
      >
        {children}
      </Typography>
      {(overflows || expanded) && (
        <Box
          component="button"
          type="button"
          onClick={toggle}
          aria-expanded={expanded}
          sx={{
            mt: 0.25, p: 0, border: 'none', background: 'none', cursor: 'pointer',
            font: 'inherit', fontSize: 12, fontWeight: 700, color: 'primary.main',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          {expanded ? lessLabel : moreLabel}
        </Box>
      )}
    </>
  );
};

export default ExpandableText;
