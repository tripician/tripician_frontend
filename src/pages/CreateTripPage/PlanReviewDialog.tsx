import React from 'react';
import {
  Box, Dialog, DialogContent, Typography, Button, IconButton, Chip, LinearProgress, useTheme,
} from '@mui/material';
import { IconX, IconRefresh, IconCheck, IconRoute, IconShieldCheck } from '@tabler/icons-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { runFeasibility, type FeasibilityReport, type FeasibilityStop } from './feasibility';

interface PlanReviewDialogProps {
  open: boolean;
  onClose: () => void;
  tripName: string;
  tripVibe?: string | null;
}

const SEVERITY_META: Record<string, { label: string; color: string; bg: string }> = {
  high:   { label: 'High',   color: '#dc2626', bg: 'rgba(220,38,38,0.10)' },
  medium: { label: 'Medium', color: '#d97706', bg: 'rgba(217,119,6,0.10)' },
  low:    { label: 'Low',    color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
};

const CATEGORY_LABELS: Record<string, string> = {
  pacing: 'Pacing',
  routing: 'Routing',
  logistics: 'Logistics',
  variety: 'Variety',
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
  open, onClose, tripName, tripVibe,
}) => {
  const theme = useTheme();
  const planner = useSelector((s: RootState) => s.planner);
  // Bumping this re-runs the checks after the user edits the plan behind the dialog.
  const [runId, setRunId] = React.useState(0);

  const report: FeasibilityReport = React.useMemo(() => {
    const stops: FeasibilityStop[] = planner.destinations.map(d => ({
      id: d.id,
      name: d.name,
      nights: d.nights || 0,
      lat: d.lat,
      lng: d.lng,
      spots: d.spots ?? [],
      startDate: d.startDate,
      stays: d.stays ?? [],
    }));
    return runFeasibility({
      stops,
      tripStartDate: planner.tripStartDate,
      tripEndDate: planner.tripEndDate,
    });
    // runId is an explicit re-run trigger, not a value the result depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planner.destinations, planner.tripStartDate, planner.tripEndDate, runId]);

  const hasStops = planner.destinations.length > 0;

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
        <IconShieldCheck size={24} color='#FF385C' />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: '1.02rem', lineHeight: 1.2 }}>
            Reality check
          </Typography>
          <Typography noWrap sx={{ fontSize: '0.74rem', color: 'text.secondary', fontFamily: "'Inter',sans-serif" }}>
            {tripName}{tripVibe ? ` · ${tripVibe} style` : ''} · distances, opening hours and time budgets
          </Typography>
        </Box>
        <IconButton size='small' onClick={onClose} sx={{ color: 'text.disabled' }}>
          <IconX size={18} />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: 3, pb: 3, pt: 0 }}>
        {!hasStops && (
          <Typography sx={{ fontSize: '0.86rem', color: 'text.secondary', fontFamily: "'Inter',sans-serif", py: 3, textAlign: 'center' }}>
            Add a stop or two first, then we can check the plan against real places and travel times.
          </Typography>
        )}

        {hasStops && (
          <Box>
            {/* Score + verdict */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box sx={{ textAlign: 'center', minWidth: 72 }}>
                <Typography sx={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: '2.1rem', lineHeight: 1, color: scoreColor(report.score) }}>
                  {report.score}
                </Typography>
                <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.disabled', fontFamily: "'Inter',sans-serif" }}>
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
                <Typography sx={{ fontSize: '0.85rem', color: 'text.primary', fontFamily: "'Inter',sans-serif", lineHeight: 1.5 }}>
                  {report.verdict}
                </Typography>
              </Box>
            </Box>

            {/* Travel time - the thing experienced travellers say plans always miss */}
            {report.transitHours > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.25, p: 1.25, borderRadius: '12px', bgcolor: 'action.hover' }}>
                <IconRoute size={16} style={{ flexShrink: 0 }} />
                <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', fontFamily: "'Inter',sans-serif", lineHeight: 1.5 }}>
                  About <strong>{formatHours(report.transitHours)}</strong> of this trip is spent getting between stops
                  {report.transitHours >= 8 ? ` — that's roughly ${Math.round(report.transitHours / 8)} full day${report.transitHours >= 16 ? 's' : ''} of travel.` : '.'}
                </Typography>
              </Box>
            )}

            {/* Strengths */}
            {report.strengths.length > 0 && (
              <Box sx={{ mb: 2.25 }}>
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.disabled', fontFamily: "'Inter',sans-serif", mb: 0.75 }}>
                  What's working
                </Typography>
                {report.strengths.map((s, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 0.6 }}>
                    <IconCheck size={14} color='#16a34a' style={{ flexShrink: 0, marginTop: 3 }} />
                    <Typography sx={{ fontSize: '0.83rem', color: 'text.secondary', fontFamily: "'Inter',sans-serif", lineHeight: 1.5 }}>
                      {s}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}

            {/* Issues */}
            {report.findings.length > 0 && (
              <Box sx={{ mb: 2.25 }}>
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.disabled', fontFamily: "'Inter',sans-serif", mb: 0.75 }}>
                  Worth fixing
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {report.findings.map((issue) => {
                    const sev = SEVERITY_META[issue.severity] ?? SEVERITY_META.low;
                    return (
                      <Box key={issue.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5, flexWrap: 'wrap' }}>
                          <Chip label={sev.label} size='small' sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, borderRadius: '6px', color: sev.color, bgcolor: sev.bg }} />
                          <Typography sx={{ fontSize: '0.66rem', fontWeight: 600, color: 'text.disabled', fontFamily: "'Inter',sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {CATEGORY_LABELS[issue.category] ?? issue.category}
                          </Typography>
                          <Typography sx={{ fontSize: '0.84rem', fontWeight: 700, fontFamily: "'Inter',sans-serif", width: '100%' }}>
                            {issue.title}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', fontFamily: "'Inter',sans-serif", lineHeight: 1.5, mb: 0.5 }}>
                          {issue.detail}
                        </Typography>
                        <Typography sx={{ fontSize: '0.8rem', color: theme.palette.mode === 'light' ? '#B45309' : '#fbbf24', fontFamily: "'Inter',sans-serif", lineHeight: 1.5 }}>
                          Try: {issue.suggestion}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {report.findings.length === 0 && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 2, p: 1.5, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
                <IconCheck size={16} color='#16a34a' style={{ flexShrink: 0, marginTop: 2 }} />
                <Typography sx={{ fontSize: '0.83rem', color: 'text.secondary', fontFamily: "'Inter',sans-serif", lineHeight: 1.5 }}>
                  Nothing to flag. Every check passed against the places and dates in this plan.
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 0.5 }}>
              <Button
                variant='outlined'
                size='small'
                startIcon={<IconRefresh size={14} />}
                onClick={() => setRunId(n => n + 1)}
                sx={{ textTransform: 'none', borderRadius: '50px', fontWeight: 700, fontSize: '0.78rem' }}
              >
                Check again
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PlanReviewDialog;
