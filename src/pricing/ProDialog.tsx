import React from 'react';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Typography, useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { IconCheck } from '@tabler/icons-react';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import { planUpgrade } from './planBenefits';
import { saleLabel, strikePrice } from './planSale';
import SalePrice from './SalePrice';
import { formatMoney } from './types';
import { approximateLabel, regionOf, visitorCurrency, type DisplayRates } from './localPrice';
import type { Plan, PlanId, PlanSale } from './types';

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
 * one click away.
 */
const ProDialog: React.FC<ProDialogProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { token } = useAuthToken();

  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [currency, setCurrency] = React.useState('INR');
  const [rates, setRates] = React.useState<DisplayRates | null>(null);
  const [sale, setSale] = React.useState<PlanSale | null>(null);
  const [myPlanId, setMyPlanId] = React.useState<PlanId | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Rupees unless the browser says where it is and the server sent a rate for there.
  const local = React.useMemo(
    () => visitorCurrency(regionOf(typeof navigator === 'undefined' ? [] : navigator.languages), rates),
    [rates],
  );

  React.useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);

    apiServices.getPlans()
      .then((r) => {
        if (!active) return;
        setPlans(Array.isArray(r.data?.plans) ? r.data.plans : []);
        setCurrency(r.data?.currency ?? 'INR');
        setRates(r.data?.display ?? null);
        setSale(r.data?.sale ?? null);
      })
      .catch(() => { if (active) { setPlans([]); setRates(null); setSale(null); } })
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

  // The server has already applied any sale, so the MRP is what gets struck.
  const monthlyStruck = target ? strikePrice(target.monthlyMrp, target.monthlyPrice) : null;
  const monthlySale = target ? saleLabel(sale?.label, target.monthlyMrp, target.monthlyPrice) : null;
  const annualSaving = target ? target.monthlyPrice * 12 - target.annualPrice : 0;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: '18px' } }}>
      {/* No glyph. The sparkle that was here meant four different things across
          this codebase, and neither the pricing page nor the landing plan table
          marks a tier with one. The name is enough. */}
      <DialogTitle sx={{ pb: 1 }}>
        {onPro ? 'You are on Tripician Pro' : 'Tripician Pro'}
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
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                You are on {current.name}
                {current.monthlyPrice === 0 ? ', which is free' : `, at ${formatMoney(current.monthlyPrice, currency)} a month`}.
              </Typography>
            )}

            {/*
              The offer sits in its own panel.

              Before this it was plain text under a divider, weighted exactly the
              same as the plan you already have, so the thing being sold had no
              more presence than the thing you were leaving. One tonal step and a
              hairline is how this product elevates a card - the landing page's
              featured plan does the same and says so - and it is a wash rather
              than a lift, which is what keeps it from looking generated.
            */}
            <Box
              sx={{
                p: 2.25,
                borderRadius: '14px',
                bgcolor: 'background.default',
                border: `1px solid ${theme.custom.surface.border}`,
              }}
            >
              <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block' }}>
                {onPro ? 'What Business adds' : 'What Pro adds'}
              </Typography>

              {/*
                The price is the figure, not a clause in a sentence.

                /pricing already sets it as a display heading and this dialog set
                it inline at body size, so the surface doing the selling looked
                cheaper than the page it links to. h3 carries the editorial face
                from the type scale, so no font is named here.
              */}
              <Typography variant="h3" component="p" sx={{ color: 'text.primary', mt: 0.5, lineHeight: 1.1 }}>
                {monthlyStruck !== null
                  ? <SalePrice mrp={monthlyStruck} payable={target.monthlyPrice} currency={currency} />
                  : formatMoney(target.monthlyPrice, currency)}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>a month</Typography>

              {/* A struck price needs its reason beside it, the same rule as /pricing. */}
              {monthlySale && (
                <Chip
                  size="small"
                  color="primary"
                  variant="outlined"
                  label={monthlySale}
                  sx={{ mt: 1, fontWeight: 700 }}
                />
              )}

              {/* Approximate, and charged in rupees whatever it says here. */}
              {approximateLabel(target.monthlyPrice, local, rates) && (
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>
                  {approximateLabel(target.monthlyPrice, local, rates)} a month, charged in {currency}
                </Typography>
              )}

              {/* The yearly price with what it saves, because "or X a year" on its
                  own asks the reader to do the twelve times table. */}
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5, mb: 2 }}>
                or {formatMoney(target.annualPrice, currency)} a year
                {annualSaving > 0 && `, ${formatMoney(annualSaving, currency)} less than paying monthly`}
              </Typography>

              {upgrade.length > 0 ? (
                <Box sx={{ display: 'grid', gap: 1.1 }}>
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
            </Box>

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
