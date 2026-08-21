import React from 'react';
import { BRAND } from '../../theme';
import {
  Box, Dialog, DialogContent, Typography, Button, IconButton, Chip, LinearProgress, useTheme,
} from '@mui/material';
import { IconX, IconCheck, IconRoute, IconRulerMeasure, IconArrowRight } from '@tabler/icons-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { type FeasibilityReport } from './feasibility';
import { useFeasibility } from './useFeasibility';

interface PlanReviewDialogProps {
  open: boolean;
  onClose: () => void;
  /**
   * Jump to a stop on the board. Without this the dialog is a pure report - it had
   * no callbacks at all, so it structurally could not act on the plan it critiques.
   */
  onGoToStop?: (stopName: string) => void;
}
// `tripName`/`tripVibe` were removed with the subtitle rewrite: the subtitle now
// carries the trust claim ("measured, not guessed") instead of restating which trip
// you are looking at, which a modal opened from that trip does not need to say.

const SEVERITY_META: Record<string, { label: string; color: string; bg: string }> = {
  high:   { label: 'High',   color: '#dc2626', bg: 'rgba(220,38,38,0.10)' },
  medium: { label: 'Medium', color: '#d97706', bg: 'rgba(217,119,6,0.10)' },
  low:    { label: 'Low',    color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
};

const CATEGORY_LABELS: Record<string, string> = {
  pacing: 'Pacing',
  routing: 'Routing',
  logistics: 'Logistics',
  gaps: 'Gaps',
};

const scoreColor = (score: number) =>
  score >= 75 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';

const formatHours = (h: number) => (h >= 1 ? `${h.toFixed(1)}h` : `${Math.round(h * 60)}min`);

/**
 * Reality check - whole-plan feedback for editors.
 *
 * Runs the deterministic checks in ./feasibility against the LIVE Redux plan, so
 * unsaved edits are included and every finding is something we can actually
 * demonstrate: real distances, real opening hours, real time budgets. It costs
 * nothing to run and makes no network call, which is why there is no credit
 * charge and no loading state.
 */
const PlanReviewDialog: React.FC<PlanReviewDialogProps> = ({
  open, onClose, onGoToStop,
}) => {
  const theme = useTheme();
  const destinationCount = useSelector((s: RootState) => s.planner.destinations.length);
  // Shared with the toolbar pill, so the number on the button and the findings in
  // here are always the same computation. The memo re-runs on any plan edit, which
  // is why the old explicit "Check again" button is gone - it was re-running
  // something that had already re-run.
  const report: FeasibilityReport = useFeasibility();

  const hasStops = destinationCount > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth='sm'
      PaperProps={{ sx: { borderRadius: '18px', maxHeight: '86vh' } }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 3, pt: 2.5, pb: 1.5 }}>
        <IconRulerMeasure size={24} color={BRAND.coral} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1.02rem', lineHeight: 1.2 }}>
            Reality check
          </Typography>
          {/* The trust argument IS the subtitle: this is arithmetic, not a model
              guessing. The old line listed the inputs but never made the claim,
              which is the one thing that separates this from an AI suggestion. */}
          <Typography noWrap sx={{ fontSize: '0.74rem', color: 'text.secondary',}}>
            Real distances, opening hours and day budgets. Measured, not guessed.
          </Typography>
        </Box>
        <IconButton size='small' onClick={onClose} sx={{ color: 'text.disabled' }}>
          <IconX size={18} />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: 3, pb: 3, pt: 0 }}>
        {!hasStops && (
          <Typography sx={{ fontSize: '0.86rem', color: 'text.secondary', py: 3, textAlign: 'center' }}>
            Add a stop or two first, then we can check the plan against real places and travel times.
          </Typography>
        )}

        {hasStops && (
          <Box>
            {/* Score + verdict */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box sx={{ textAlign: 'center', minWidth: 72 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '2.1rem', lineHeight: 1, color: scoreColor(report.score) }}>
                  {report.score}
                </Typography>
                <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.disabled',}}>
                  / 100
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <LinearProgress
                  variant='determinate'
                  value={report.score}
                  sx={{
                    height: 7, borderRadius: 4, bgcolor: 'action.hover', mb: 1,
                    '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: scoreColor(report.score) },
                  }}
                />
                <Typography sx={{ fontSize: '0.85rem', color: 'text.primary', lineHeight: 1.5 }}>
                  {report.verdict}
                </Typography>
              </Box>
            </Box>

            {/* Travel time - the thing experienced travellers say plans always miss */}
            {report.transitHours > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.25, p: 1.25, borderRadius: '12px', bgcolor: 'action.hover' }}>
                <IconRoute size={16} style={{ flexShrink: 0 }} />
                <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', lineHeight: 1.5 }}>
                  About <strong>{formatHours(report.transitHours)}</strong> of this trip is spent getting between stops
                  {report.transitHours >= 8 ? `, which is roughly ${Math.round(report.transitHours / 8)} full day${report.transitHours >= 16 ? 's' : ''} of travel.` : '.'}
                </Typography>
              </Box>
            )}

            {/* Strengths */}
            {report.strengths.length > 0 && (
              <Box sx={{ mb: 2.25 }}>
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.disabled', mb: 0.75 }}>
                  What's working
                </Typography>
                {report.strengths.map((s, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 0.6 }}>
                    <IconCheck size={14} color='#16a34a' style={{ flexShrink: 0, marginTop: 3 }} />
                    <Typography sx={{ fontSize: '0.83rem', color: 'text.secondary', lineHeight: 1.5 }}>
                      {s}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}

            {/* Issues */}
            {report.findings.length > 0 && (
              <Box sx={{ mb: 2.25 }}>
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.disabled', mb: 0.75 }}>
                  Worth fixing
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {report.findings.map((issue) => {
                    const sev = SEVERITY_META[issue.severity] ?? SEVERITY_META.low;
                    return (
                      <Box key={issue.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5, flexWrap: 'wrap' }}>
                          <Chip label={sev.label} size='small' sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, borderRadius: '6px', color: sev.color, bgcolor: sev.bg }} />
                          <Typography sx={{ fontSize: '0.66rem', fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {CATEGORY_LABELS[issue.category] ?? issue.category}
                          </Typography>
                          <Typography sx={{ fontSize: '0.84rem', fontWeight: 700, width: '100%' }}>
                            {issue.title}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', lineHeight: 1.5, mb: 0.5 }}>
                          {issue.detail}
                        </Typography>
                        {/* "Try:" read like a debug prefix. The suggestion is the most
                            useful line in the card, so it gets a real label. */}
                        <Typography sx={{ fontSize: '0.8rem', color: theme.palette.mode === 'light' ? '#B45309' : '#fbbf24', lineHeight: 1.5 }}>
                          <Box component='span' sx={{ fontWeight: 700 }}>What to do: </Box>{issue.suggestion}
                        </Typography>
                        {/* stopName was populated by four of the six checks and never
                            rendered. Showing it turns "somewhere is overloaded" into
                            "this stop is", and makes the finding navigable. */}
                        {issue.stopName && onGoToStop && (
                          <Box
                            component='button'
                            type='button'
                            onClick={() => { onGoToStop(issue.stopName!); onClose(); }}
                            sx={(t) => ({
                              display: 'inline-flex', alignItems: 'center', gap: 0.4,
                              mt: 1, p: 0, border: 'none', bgcolor: 'transparent',
                              fontFamily: 'inherit', fontSize: '0.76rem', fontWeight: 600,
                              color: 'text.secondary', cursor: 'pointer',
                              transition: `color ${t.custom.motion.duration.fast} ${t.custom.motion.easing.standard}`,
                              '&:hover': { color: 'primary.main' },
                              '&:focus-visible': { outline: `2px solid ${t.custom.ring}`, outlineOffset: 2 },
                            })}
                          >
                            Go to {issue.stopName}
                            <IconArrowRight size={13} stroke={2} />
                          </Box>
                        )}
                        {issue.stopName && !onGoToStop && (
                          <Typography sx={{ mt: 0.75, fontSize: '0.76rem', fontWeight: 600, color: 'text.disabled',}}>
                            {issue.stopName}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {report.findings.length === 0 && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 2, p: 1.5, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
                <IconCheck size={16} color='#16a34a' style={{ flexShrink: 0, marginTop: 2 }} />
                <Typography sx={{ fontSize: '0.83rem', color: 'text.secondary', lineHeight: 1.5 }}>
                  Nothing to flag. Every check passed against the places and dates in this plan.
                </Typography>
              </Box>
            )}

            {/* No "Check again": the report is a memo over the live plan, so it has
                already re-run by the time you could press it. Closing to go fix
                something is the only action left worth offering. */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, pt: 0.5 }}>
              <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled', lineHeight: 1.45 }}>
                Re-checks itself as you edit, so there is no need to run it again.
              </Typography>
              <Button
                variant='contained'
                size='small'
                onClick={onClose}
                sx={{ textTransform: 'none', borderRadius: '50px', fontWeight: 700, fontSize: '0.78rem', flexShrink: 0 }}
              >
                {report.findings.length > 0 ? 'Got it' : 'Close'}
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PlanReviewDialog;
