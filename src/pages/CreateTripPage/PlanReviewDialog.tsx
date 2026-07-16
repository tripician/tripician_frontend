import React from 'react';
import {
  Box, Dialog, DialogContent, Typography, Button, IconButton, Chip, LinearProgress, useTheme,
} from '@mui/material';
import { IconX, IconRefresh, IconCheck, IconBulb } from '@tabler/icons-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import NaviaOrb from '../../navia/NaviaOrb';
import { reviewTripPlan, NaviaRequestError, type PlanReviewResult } from '../../navia/naviaService';

interface PlanReviewDialogProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  token: string | null | undefined;
  tripName: string;
  tripVibe?: string | null;
}

const REVIEW_MESSAGES = [
  'Reading your route like a tour designer…',
  'Checking the pacing of each stop…',
  'Weighing transit time against real days…',
  'Looking for gaps most planners miss…',
  'Writing your feedback…',
];

const SEVERITY_META: Record<string, { label: string; color: string; bg: string }> = {
  high:   { label: 'High',   color: '#dc2626', bg: 'rgba(220,38,38,0.10)' },
  medium: { label: 'Medium', color: '#d97706', bg: 'rgba(217,119,6,0.10)' },
  low:    { label: 'Low',    color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
};

const CATEGORY_LABELS: Record<string, string> = {
  pacing: 'Pacing',
  routing: 'Routing',
  logistics: 'Logistics',
  budget: 'Budget',
  variety: 'Variety',
  gaps: 'Gaps',
};

const scoreColor = (score: number) =>
  score >= 75 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';

/**
 * "Review my plan" — whole-plan AI feedback for plan editors.
 * Sends a compact snapshot of the LIVE Redux plan so unsaved edits are reviewed too.
 */
const PlanReviewDialog: React.FC<PlanReviewDialogProps> = ({
  open, onClose, tripId, token, tripName, tripVibe,
}) => {
  const theme = useTheme();
  const planner = useSelector((s: RootState) => s.planner);
  const [loading, setLoading] = React.useState(false);
  const [loadingMsg, setLoadingMsg] = React.useState(REVIEW_MESSAGES[0]);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<PlanReviewResult | null>(null);
  const msgTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const buildPlanSummary = React.useCallback((): string => {
    const lines: string[] = [];
    const totalNights = planner.destinations.reduce((a, d) => a + (d.nights || 0), 0);
    lines.push(`Stops in order (${planner.destinations.length}):`);
    planner.destinations.forEach((d, i) => {
      const spots = (d.spots ?? []).map(s => s.name).filter(Boolean);
      const foods = (d.foods ?? []).map(f => f.name).filter(Boolean);
      const stays = (d.stays ?? []).length;
      const parts = [
        `${i + 1}. ${d.name}${d.title ? ` ("${d.title}")` : ''} — ${d.nights} night${d.nights === 1 ? '' : 's'}`,
        d.startDate && d.endDate ? `dates ${d.startDate} to ${d.endDate}` : 'dates unset',
        spots.length ? `spots: ${spots.slice(0, 8).join(', ')}` : 'no spots planned',
        foods.length ? `foods: ${foods.slice(0, 6).join(', ')}` : 'no food ideas',
        stays > 0 ? `${stays} stay${stays === 1 ? '' : 's'} noted` : 'no stay noted',
        d.notes?.trim() ? 'has journal notes' : 'no notes',
      ];
      lines.push(parts.join(' | '));
    });
    lines.push(`Total nights placed: ${totalNights} of ${planner.targetNights} target.`);
    if (typeof planner.tripBudget === 'number' && planner.tripBudget > 0) {
      lines.push(`Trip budget: ${planner.tripBudget} ${planner.currency}. Expenses logged: ${(planner.expenses ?? []).length}.`);
    } else {
      lines.push('No budget set.');
    }
    return lines.join('\n');
  }, [planner]);

  const runReview = React.useCallback(async () => {
    if (!token || !tripId || loading) return;
    setLoading(true);
    setError(null);
    let idx = 0;
    setLoadingMsg(REVIEW_MESSAGES[0]);
    msgTimerRef.current = setInterval(() => {
      idx = (idx + 1) % REVIEW_MESSAGES.length;
      setLoadingMsg(REVIEW_MESSAGES[idx]);
    }, 2200);
    try {
      const review = await reviewTripPlan(tripId, buildPlanSummary(), token);
      setResult(review);
    } catch (err) {
      if (err instanceof NaviaRequestError && err.status === 402) {
        setError("This trip's shared wallet is out of credits, so Navia can't review the plan right now.");
      } else {
        setError('Navia could not review the plan right now. Please try again in a moment.');
      }
    } finally {
      if (msgTimerRef.current) { clearInterval(msgTimerRef.current); msgTimerRef.current = null; }
      setLoading(false);
    }
  }, [token, tripId, loading, buildPlanSummary]);

  React.useEffect(() => () => { if (msgTimerRef.current) clearInterval(msgTimerRef.current); }, []);

  // First open with no cached result: run automatically.
  React.useEffect(() => {
    if (open && !result && !loading && !error) void runReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const hasStops = planner.destinations.length > 0;

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      fullWidth
      maxWidth='sm'
      PaperProps={{ sx: { borderRadius: '18px', maxHeight: '86vh' } }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 3, pt: 2.5, pb: 1.5 }}>
        <NaviaOrb size={26} processing={loading} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: '1.02rem', lineHeight: 1.2 }}>
            Navia's plan review
          </Typography>
          <Typography noWrap sx={{ fontSize: '0.74rem', color: 'text.secondary', fontFamily: "'Inter',sans-serif" }}>
            {tripName}{tripVibe ? ` · ${tripVibe} style` : ''} · 2 trip credits per review
          </Typography>
        </Box>
        <IconButton size='small' onClick={onClose} disabled={loading} sx={{ color: 'text.disabled' }}>
          <IconX size={18} />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: 3, pb: 3, pt: 0 }}>
        {!hasStops && !loading && !result && (
          <Typography sx={{ fontSize: '0.86rem', color: 'text.secondary', fontFamily: "'Inter',sans-serif", py: 3, textAlign: 'center' }}>
            Add a stop or two first — then Navia will have a plan to review.
          </Typography>
        )}

        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 6 }}>
            <NaviaOrb size={44} processing />
            <Typography sx={{ fontSize: '0.86rem', color: 'text.secondary', fontFamily: "'Inter',sans-serif" }}>
              {loadingMsg}
            </Typography>
          </Box>
        )}

        {!loading && error && (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.86rem', color: 'error.main', fontFamily: "'Inter',sans-serif", mb: 2 }}>
              {error}
            </Typography>
            <Button
              variant='outlined'
              size='small'
              startIcon={<IconRefresh size={15} />}
              onClick={() => { setError(null); void runReview(); }}
              sx={{ textTransform: 'none', borderRadius: '50px', fontWeight: 700 }}
            >
              Try again
            </Button>
          </Box>
        )}

        {!loading && !error && result && (
          <Box>
            {/* Score + verdict */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box sx={{ textAlign: 'center', minWidth: 72 }}>
                <Typography sx={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: '2.1rem', lineHeight: 1, color: scoreColor(result.score) }}>
                  {result.score}
                </Typography>
                <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.disabled', fontFamily: "'Inter',sans-serif" }}>
                  / 100
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <LinearProgress
                  variant='determinate'
                  value={result.score}
                  sx={{
                    height: 7, borderRadius: 4, bgcolor: 'action.hover', mb: 1,
                    '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: scoreColor(result.score) },
                  }}
                />
                <Typography sx={{ fontSize: '0.85rem', color: 'text.primary', fontFamily: "'Inter',sans-serif", lineHeight: 1.5 }}>
                  {result.verdict}
                </Typography>
              </Box>
            </Box>

            {/* Strengths */}
            {result.strengths.length > 0 && (
              <Box sx={{ mb: 2.25 }}>
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.disabled', fontFamily: "'Inter',sans-serif", mb: 0.75 }}>
                  What's working
                </Typography>
                {result.strengths.map((s, i) => (
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
            {result.issues.length > 0 && (
              <Box sx={{ mb: 2.25 }}>
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.disabled', fontFamily: "'Inter',sans-serif", mb: 0.75 }}>
                  Worth fixing
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {result.issues.map((issue, i) => {
                    const sev = SEVERITY_META[issue.severity] ?? SEVERITY_META.low;
                    return (
                      <Box key={i} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5, flexWrap: 'wrap' }}>
                          <Chip label={sev.label} size='small' sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, borderRadius: '6px', color: sev.color, bgcolor: sev.bg }} />
                          {issue.category && (
                            <Typography sx={{ fontSize: '0.66rem', fontWeight: 600, color: 'text.disabled', fontFamily: "'Inter',sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              {CATEGORY_LABELS[issue.category] ?? issue.category}
                            </Typography>
                          )}
                          <Typography sx={{ fontSize: '0.84rem', fontWeight: 700, fontFamily: "'Inter',sans-serif", width: '100%' }}>
                            {issue.title}
                          </Typography>
                        </Box>
                        {issue.detail && (
                          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', fontFamily: "'Inter',sans-serif", lineHeight: 1.5, mb: issue.suggestion ? 0.5 : 0 }}>
                            {issue.detail}
                          </Typography>
                        )}
                        {issue.suggestion && (
                          <Typography sx={{ fontSize: '0.8rem', color: theme.palette.mode === 'light' ? '#B45309' : '#fbbf24', fontFamily: "'Inter',sans-serif", lineHeight: 1.5 }}>
                            Try: {issue.suggestion}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* Quick wins */}
            {result.quickWins.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.disabled', fontFamily: "'Inter',sans-serif", mb: 0.75 }}>
                  Quick wins
                </Typography>
                {result.quickWins.map((q, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 0.6 }}>
                    <IconBulb size={14} color='#FF385C' style={{ flexShrink: 0, marginTop: 3 }} />
                    <Typography sx={{ fontSize: '0.83rem', color: 'text.secondary', fontFamily: "'Inter',sans-serif", lineHeight: 1.5 }}>
                      {q}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 0.5 }}>
              <Button
                variant='outlined'
                size='small'
                startIcon={<IconRefresh size={14} />}
                onClick={() => void runReview()}
                sx={{ textTransform: 'none', borderRadius: '50px', fontWeight: 700, fontSize: '0.78rem' }}
              >
                Review again
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PlanReviewDialog;
