import React from 'react';
import { BRAND } from '../../theme';
import { Box, Button, Popover, Tooltip, Typography, useTheme, type Theme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { IconCheck, IconSparkles } from '@tabler/icons-react';
import confetti from 'canvas-confetti';

/**
 * TripPulse - the trip readiness engine.
 *
 * Computes nothing itself: the parent (TripPlanner) owns all state and passes
 * scored dimensions in. Each dimension carries a one-tap action that jumps the
 * user to the exact place where they can complete it, so the pulse doubles as
 * a "what's next" guide throughout planning.
 */

export interface PulseDimension {
  id: string;
  label: string;
  /** Weight towards the total score (all weights should sum to 100) */
  weight: number;
  /** 0..1 completion of this dimension */
  progress: number;
  /** Short status line, e.g. "3 stops · 8 nights" or "No dates yet" */
  detail: string;
  icon: React.ElementType;
  actionLabel: string;
  onAction: () => void;
}

interface TripPulseProps {
  dimensions: PulseDimension[];
  /** Days until departure (negative = past); null = no dates set */
  daysToGo: number | null;
}

const ringColor = (score: number, theme: Theme) =>
  score >= 100 ? theme.palette.success.main : theme.palette.primary.main;

const TripPulse: React.FC<TripPulseProps> = ({ dimensions, daysToGo }) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const celebratedRef = React.useRef(false);

  const score = React.useMemo(() => {
    const total = dimensions.reduce((acc, d) => acc + d.weight * Math.max(0, Math.min(1, d.progress)), 0);
    return Math.round(total);
  }, [dimensions]);

  // One celebration per mount when the trip first reaches 100%
  React.useEffect(() => {
    if (score >= 100 && !celebratedRef.current) {
      celebratedRef.current = true;
      confetti({ particleCount: 90, spread: 75, origin: { y: 0.2 }, disableForReducedMotion: true });
    }
    if (score < 100) celebratedRef.current = false;
  }, [score]);

  const next = dimensions.filter((d) => d.progress < 1).sort((a, b) => b.weight - a.weight)[0];
  const color = ringColor(score, theme);

  const R = 9;
  const C = 2 * Math.PI * R;

  return (
    <>
      <Tooltip title="Trip readiness - see what's left to plan" arrow placement="bottom">
        <Box
          component="button"
          onClick={(e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)}
          aria-label={`Trip readiness ${score} percent`}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.8,
            height: 32,
            px: 1.1,
            borderRadius: '20px',
            border: `1px solid ${score >= 100 ? 'rgba(52,211,153,0.5)' : theme.custom.surface.border}`,
            background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'border-color .25s, background .2s',
            fontFamily: 'inherit',
            '&:hover': { background: theme.custom.surface.brandTint, borderColor: alpha(BRAND.coral, 0.4) },
            '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
          }}
        >
          <Box component="svg" viewBox="0 0 24 24" sx={{ width: 20, height: 20, transform: 'rotate(-90deg)', flexShrink: 0 }}>
            <circle cx="12" cy="12" r={R} fill="none" stroke={theme.custom.surface.active} strokeWidth="3" />
            <circle
              cx="12"
              cy="12"
              r={R}
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${C}`}
              strokeDashoffset={`${C * (1 - score / 100)}`}
              style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.4,0,.2,1), stroke .3s' }}
            />
          </Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1, color: 'text.primary' }}>{score}%</Typography>
          <Typography sx={{ display: { xs: 'none', md: 'block' }, fontSize: 11, fontWeight: 500, lineHeight: 1, color: 'text.secondary' }}>
            ready
          </Typography>
        </Box>
      </Tooltip>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { mt: 1, width: 340, borderRadius: '18px', overflow: 'hidden' } }}
      >
        {/* Header */}
        <Box sx={{ px: 2.25, pt: 2, pb: 1.75, background: theme.custom.gradients.brandSubtle, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.92rem', lineHeight: 1.2 }}>Trip Pulse</Typography>
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: 0.25 }}>
                {score >= 100
                  ? 'Everything is in place. Enjoy the anticipation!'
                  : daysToGo != null && daysToGo >= 0
                    ? `${score}% ready · ${daysToGo === 0 ? 'departure day!' : `${daysToGo} day${daysToGo === 1 ? '' : 's'} to go`}`
                    : `${score}% ready`}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '1.45rem', fontWeight: 700, color }}>{score}%</Typography>
          </Box>
          {/* Next best action */}
          {next && (
            <Box
              sx={{
                mt: 1.25,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.25,
                py: 0.9,
                borderRadius: '12px',
                background: theme.palette.background.paper,
                border: `1px solid ${theme.custom.surface.border}`,
              }}
            >
              <IconSparkles size={15} color={theme.palette.primary.main} style={{ flexShrink: 0 }} />
              <Typography sx={{ flex: 1, fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary' }} noWrap>
                Next: {next.label.toLowerCase()}
              </Typography>
              <Button
                size="small"
                variant="contained"
                onClick={() => {
                  setAnchorEl(null);
                  next.onAction();
                }}
                sx={{ fontSize: '0.68rem', px: 1.25, py: 0.4, minWidth: 0 }}
              >
                {next.actionLabel}
              </Button>
            </Box>
          )}
        </Box>

        {/* Dimensions */}
        <Box sx={{ py: 0.75 }}>
          {dimensions.map((d) => {
            const done = d.progress >= 1;
            const Icon = d.icon;
            return (
              <Box
                key={d.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  px: 2,
                  py: 1,
                  '&:hover': { background: theme.custom.surface.hover },
                }}
              >
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    background: done ? 'rgba(52,211,153,0.14)' : theme.custom.surface.hover,
                  }}
                >
                  {done ? (
                    <IconCheck size={15} stroke={2.5} color={theme.palette.success.main} />
                  ) : (
                    <Icon size={15} stroke={1.9} color={theme.palette.text.secondary} />
                  )}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: done ? 'text.secondary' : 'text.primary' }} noWrap>
                    {d.label}
                  </Typography>
                  <Typography sx={{ fontSize: '0.66rem', color: 'text.disabled' }} noWrap>
                    {d.detail}
                  </Typography>
                </Box>
                {!done && (
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => {
                      setAnchorEl(null);
                      d.onAction();
                    }}
                    sx={{ fontSize: '0.68rem', fontWeight: 700, px: 1, minWidth: 0, color: 'primary.main', flexShrink: 0 }}
                  >
                    {d.actionLabel}
                  </Button>
                )}
              </Box>
            );
          })}
        </Box>
      </Popover>
    </>
  );
};

export default TripPulse;
