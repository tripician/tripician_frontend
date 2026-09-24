import React from 'react';
import { Box, Button, LinearProgress, Typography, useTheme } from '@mui/material';
import { IconCheck } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import SegmentedControl from '../components/ui/SegmentedControl';
import SectionHeader from '../components/ui/SectionHeader';
import { loadRazorpay, openRazorpaySubscription } from '../afterstory/book/razorpay';
import { planUpgrade } from '../pricing/planBenefits';
import { formatMoney, type Plan, type SubscriptionState } from '../pricing/types';
import { serverMessage } from '../utils/apiError';
import { groupIsFull } from './groupLogic';
import { asGroupCredits, type GroupCredits, type Organization } from './types';

type Billing = 'monthly' | 'annual';

const BILLING: { value: Billing; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Yearly' },
];

// What the group is on, how full it is, and the one paid plan that fits it. Admins only; the server checks again.
const GroupPlanPanel: React.FC<{ organization: Organization }> = ({ organization }) => {
  const theme = useTheme();
  const { token } = useAuthToken();
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [credits, setCredits] = React.useState<GroupCredits | null>(null);
  const [subscription, setSubscription] = React.useState<SubscriptionState | null>(null);
  const [billing, setBilling] = React.useState<Billing>('monthly');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    apiServices.getPlans()
      .then((r) => { if (active) setPlans(Array.isArray(r.data?.plans) ? r.data.plans : []); })
      .catch(() => { if (active) setPlans([]); });
    apiServices.getGroupCredits(organization.id)
      .then((r) => { if (active) setCredits(asGroupCredits(r.data)); })
      .catch(() => { if (active) setCredits(null); });
    if (token) {
      apiServices.getMySubscription(token, organization.id)
        .then((r) => { if (active) setSubscription(r.data ?? null); })
        .catch(() => { if (active) setSubscription(null); });
    }
    return () => { active = false; };
  }, [organization.id, token]);

  // The plan that actually applies, as the server resolved it; a lapsed subscription reads as Basic here too.
  const currentId = credits?.planId ?? 'basic';
  const current = plans.find((p) => p.planId === currentId) ?? plans.find((p) => p.monthlyPrice === 0) ?? null;
  const offerId = organization.kind === 'business' ? 'business' : 'club';
  const offer = plans.find((p) => p.planId === offerId) ?? null;
  const onOffer = currentId === offerId;
  const limit = organization.memberLimit;
  const full = groupIsFull(organization.memberCount, limit);

  const upgrade = async () => {
    if (!token || !offer) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (!(await loadRazorpay())) {
        setError('The payment window could not load. Check your connection and try again.');
        return;
      }
      const intent = await apiServices.createSubscription(token, {
        planId: offer.planId,
        annual: billing === 'annual',
        organizationId: organization.id,
      });
      if (!intent.data?.ok) {
        setError(intent.data?.error ?? 'That plan could not be opened for payment.');
        return;
      }
      openRazorpaySubscription({
        keyId: intent.data.keyId,
        subscriptionId: intent.data.subscriptionId,
        description: intent.data.description ?? `${offer.name} for ${organization.name}`,
        // Nothing turns on here: the plan starts when Razorpay confirms the first payment to the server.
        onPaid: () => setNotice(`Thank you. ${organization.name} moves to ${offer.name} as soon as the payment settles.`),
        onDismissed: () => setNotice('No payment was taken.'),
        onFailed: (message) => setError(message),
      });
    } catch (err) {
      setError(serverMessage(err) ?? 'That could not be started. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!token || !window.confirm(`Stop paying for ${current?.name ?? 'this plan'}? The group keeps it until the end of the period already paid.`)) return;
    setBusy(true);
    setError(null);
    try {
      await apiServices.cancelSubscription(token, organization.id);
      setSubscription((prev) => (prev ? { ...prev, status: 'cancelled', canCancel: false } : prev));
      setNotice(subscription?.renewsAt
        ? `Cancelled. The group keeps its plan until ${dayjs(subscription.renewsAt).format('D MMM YYYY')}.`
        : 'Cancelled.');
    } catch (err) {
      setError(serverMessage(err) ?? 'That could not be cancelled. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const card = {
    borderRadius: '16px',
    border: `1px solid ${theme.custom.surface.border}`,
    bgcolor: 'background.paper',
    p: { xs: 2, sm: 2.5 },
  } as const;

  // Nothing to sell, nothing paid for and no cap: a free group with no plan on offer needs no plan section at all.
  const selling = Boolean(offer && !onOffer && organization.status === 'approved');
  if (!selling && currentId === 'basic' && typeof limit !== 'number') return null;

  const gains = offer && !onOffer ? planUpgrade(current, offer) : [];
  const price = offer ? (billing === 'annual' ? offer.annualPrice : offer.monthlyPrice) : 0;

  return (
    <Box sx={{ maxWidth: 640, display: 'grid', gap: 2 }}>
      <SectionHeader title="Plan" subtitle="What this group is on, and what paying for it would change." />

      <Box sx={card}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{current?.name ?? 'Tripician Basic'}</Typography>
        {subscription?.renewsAt && currentId !== 'basic' && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
            {subscription.status === 'cancelled' ? 'Ends' : 'Renews'} on {dayjs(subscription.renewsAt).format('D MMM YYYY')}
          </Typography>
        )}

        {typeof limit === 'number' ? (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ color: 'text.primary' }}>
              {organization.memberCount} of {limit} members
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, (organization.memberCount / Math.max(limit, 1)) * 100)}
              aria-label="Members used"
              sx={{ mt: 0.75, height: 6, borderRadius: 3 }}
            />
            {full && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                The group is full. Requests wait and invite links stop working until someone leaves or the group moves up a plan.
              </Typography>
            )}
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5 }}>
            {organization.memberCount} {organization.memberCount === 1 ? 'member' : 'members'}, no limit
          </Typography>
        )}

        {credits && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5 }}>
            {credits.balance.toLocaleString('en-IN')} TripicianAI credits in the group wallet
            {credits.monthlyCredits > 0 ? `, ${credits.monthlyCredits.toLocaleString('en-IN')} added each month` : ''}.
            A plan in the group draws on them when its own run out.
          </Typography>
        )}

        {subscription?.canCancel && currentId !== 'basic' && (
          <Button onClick={() => void cancel()} disabled={busy} sx={{ textTransform: 'none', color: 'text.secondary', mt: 1.5, ml: -1 }}>
            Cancel the plan
          </Button>
        )}
      </Box>

      {selling && offer && (
        <Box sx={card}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{offer.name}</Typography>
            <SegmentedControl size="small" aria-label="Billing period" value={billing} options={BILLING} onChange={setBilling} />
          </Box>
          <Typography variant="h3" component="p" sx={{ mt: 1 }}>
            {formatMoney(price)}
            <Typography component="span" variant="body2" sx={{ color: 'text.secondary', ml: 0.75 }}>
              {billing === 'annual' ? 'a year' : 'a month'}
            </Typography>
          </Typography>

          {gains.length > 0 && (
            <Box sx={{ display: 'grid', gap: 0.75, mt: 1.5 }}>
              {gains.map((line) => (
                <Box key={line} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <IconCheck size={16} style={{ marginTop: 2, flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>{line}</Typography>
                </Box>
              ))}
            </Box>
          )}

          <Button variant="contained" onClick={() => void upgrade()} disabled={busy} sx={{ textTransform: 'none', fontWeight: 700, mt: 2 }}>
            {busy ? 'Opening' : `Move ${organization.name} to ${offer.name.replace('Tripician ', '')}`}
          </Button>
          <Typography variant="caption" component="p" sx={{ color: 'text.secondary', mt: 1 }}>
            Billed to you, for this group. Cancel any time; the group keeps the plan until the paid period ends.
          </Typography>
        </Box>
      )}

      {error && <Typography variant="body2" color="error">{error}</Typography>}
      {notice && <Typography variant="body2" sx={{ color: 'text.secondary' }}>{notice}</Typography>}
    </Box>
  );
};

export default GroupPlanPanel;
