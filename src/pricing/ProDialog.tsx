import React from 'react';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, Typography, useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { IconCheck, IconSparkles } from '@tabler/icons-react';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import { planBenefits, planUpgrade } from './planBenefits';
import { formatMoney } from './types';
import type { Plan, PlanId } from './types';

interface ProDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * What you are on, and what the next plan up adds.
 *
 * Two faces, one control. On the free plan it sells Pro; on Pro it says so and
 * shows what Business is for. Every line is computed from the plans the server
 * sent, so a price or a limit changing in configuration changes this with it.
 *
 * It explains rather than gates: checkout lives on the pricing page, which is
 * one click away and is also where the Story Book price list is.
 */
const ProDialog: React.FC<ProDialogProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { token } = useAuthToken();

  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [currency, setCurrency] = React.useState('INR');
  const [myPlanId, setMyPlanId] = React.useState<PlanId | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);

    apiServices.getPlans()
      .then((r) => {
        if (!active) return;
        setPlans(Array.isArray(r.data?.plans) ? r.data.plans : []);
        setCurrency(r.data?.currency ?? 'INR');
      })
      .catch(() => { if (active) setPlans([]); })
      .finally(() => { if (active) setLoading(false); });

    // The profile column carries the raw plan and ignores expiry, so the plan
    // comes from the resolver instead: a lapsed subscription reads as Basic here.
    if (token) {
      apiServices.getMyPlan(token)
        .then((r) => { if (active) setMyPlanId(r.data?.planId ?? null); })
        .catch(() => { if (active) setMyPlanId(null); });
    }

    return () => { active = false; };
  }, [open, token]);

  const current = plans.find((p) => p.planId === (myPlanId ?? 'basic')) ?? null;
  const pro = plans.find((p) => p.planId === 'pro') ?? null;
  const business = plans.find((p) => p.planId === 'business') ?? null;

  const onPro = myPlanId === 'pro';
  // On Pro, the thing worth explaining is Business. Otherwise it is Pro itself.
  const target = onPro ? business : pro;
  const upgrade = target ? planUpgrade(current, target) : [];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: '18px' } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconSparkles size={20} style={{ color: theme.palette.primary.main }} />
          {onPro ? 'You are on Tripician Pro' : 'Tripician Pro'}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : !target ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Plan details are not available right now.
          </Typography>
        ) : (
          <>
            {current && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 0.5 }}>
                  Your plan
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="subtitle1" sx={{ color: 'text.primary' }}>{current.name}</Typography>
                  <Chip
                    size="small"
                    label={current.monthlyPrice === 0 ? 'Free' : `${formatMoney(current.monthlyPrice, currency)} a month`}
                    sx={{ fontWeight: 700, fontSize: 11, height: 22 }}
                  />
                </Box>
                <Box sx={{ display: 'grid', gap: 0.5, mt: 1 }}>
                  {planBenefits(current).map((line) => (
                    <Typography key={line} variant="caption" sx={{ color: 'text.secondary' }}>
                      {line}
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 0.5 }}>
              {onPro ? 'What Business adds' : 'What Pro adds'}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1.5 }}>
              <Typography variant="h5" component="p" sx={{ color: 'text.primary' }}>
                {formatMoney(target.monthlyPrice, currency)}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                a month, or {formatMoney(target.annualPrice, currency)} a year
              </Typography>
            </Box>

            {upgrade.length > 0 ? (
              <Box sx={{ display: 'grid', gap: 1 }}>
                {upgrade.map((line) => (
                  <Box key={line} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Box component="span" sx={{ color: 'primary.main', mt: '2px', display: 'inline-flex' }}>
                      <IconCheck size={15} stroke={2.4} />
                    </Box>
                    <Typography variant="body2" sx={{ color: 'text.primary' }}>{line}</Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Nothing you are missing. You already have everything this plan carries.
              </Typography>
            )}

            {onPro && (
              <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 2 }}>
                Business is an organization plan. It applies to the trips an organization runs, not to your own account.
              </Typography>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button color="inherit" onClick={onClose}>Not now</Button>
        <Button
          variant="contained"
          onClick={() => { onClose(); navigate('/pricing'); }}
          sx={{ borderRadius: '12px', fontWeight: 700 }}
        >
          See all plans
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProDialog;
