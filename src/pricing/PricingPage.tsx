/**
 * /pricing , three plans and the book price list.
 *
 * The rule this page is built around: nobody should have to do arithmetic to
 * find out what Tripician costs. Page bands, margins, taxes and discounts are
 * backend concerns. What a visitor sees is a number and what it buys.
 *
 * Planning, Advanced Planning and After Story appear on every card as free,
 * because they are, permanently, on every plan. That is the product, not the
 * bait.
 */

import React from 'react';
import {
  Box, Button, Chip, CircularProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography, useTheme,
} from '@mui/material';
import { IconCheck } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import Seo from '../components/Seo';
import PageHeader from '../components/ui/PageHeader';
import SegmentedControl from '../components/ui/SegmentedControl';
import { loadRazorpay, openRazorpaySubscription } from '../afterstory/book/razorpay';
import {
  formatMoney, isUnlimited,
  type Plan, type PlanId, type PublicSale, type StoryBookProduct,
} from './types';

const CONTENT_MAX = 1120;

type Billing = 'monthly' | 'annual';

const BILLING_OPTIONS: { value: Billing; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Yearly' },
];

/** What each plan is for, in one line. */
const PITCH: Record<PlanId, string> = {
  basic: 'Everything you need to plan a trip and write it up afterwards.',
  pro: 'For people who travel often, plan bigger and bring more people along.',
  business: 'For agencies, trekking groups and travel communities running trips.',
};

/** Free on every plan, said out loud on every card. */
const ALWAYS_FREE = ['Trip planning', 'Advanced planning', 'After Story'];

const PricingPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { token } = useAuthToken();

  const [billing, setBilling] = React.useState<Billing>('monthly');
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [books, setBooks] = React.useState<StoryBookProduct[]>([]);
  const [sale, setSale] = React.useState<PublicSale | null>(null);
  const [myPlanId, setMyPlanId] = React.useState<PlanId | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([apiServices.getPlans(), apiServices.getStoryBookPrices()])
      .then(([planResp, bookResp]) => {
        if (cancelled) return;
        setPlans(Array.isArray(planResp.data?.plans) ? planResp.data.plans : []);
        setBooks(Array.isArray(bookResp.data?.products) ? bookResp.data.products : []);
        setSale(bookResp.data?.sale ?? null);
      })
      .catch(() => { if (!cancelled) { setPlans([]); setBooks([]); setSale(null); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    if (!token) { setMyPlanId(null); return; }
    let cancelled = false;
    apiServices.getMyPlan(token)
      .then((resp) => { if (!cancelled) setMyPlanId(resp.data?.planId ?? null); })
      .catch(() => { if (!cancelled) setMyPlanId(null); });
    return () => { cancelled = true; };
  }, [token]);

  const [subscribing, setSubscribing] = React.useState<PlanId | null>(null);
  const [subscribeError, setSubscribeError] = React.useState<string | null>(null);
  const [subscribeNotice, setSubscribeNotice] = React.useState<string | null>(null);

  /**
   * Business belongs to an organisation, so it is chosen from that
   * organisation rather than from a price list: the page cannot know which one,
   * and guessing would commit the wrong company to a bill.
   */
  const subscribe = async (plan: Plan) => {
    if (plan.monthlyPrice === 0) return;
    if (!token) { navigate('/signin'); return; }
    if (plan.scope === 'organization') { navigate('/organizations'); return; }

    setSubscribing(plan.planId);
    setSubscribeError(null);
    setSubscribeNotice(null);

    try {
      const scriptReady = await loadRazorpay();
      if (!scriptReady) {
        setSubscribeError('The payment window could not load. Check your connection and try again.');
        return;
      }

      const intent = await apiServices.createSubscription(token, {
        planId: plan.planId,
        annual: billing === 'annual',
      });

      if (!intent.data?.ok) {
        setSubscribeError(intent.data?.error ?? 'That plan could not be opened for payment.');
        return;
      }

      openRazorpaySubscription({
        keyId: intent.data.keyId,
        subscriptionId: intent.data.subscriptionId,
        description: intent.data.description ?? plan.name,
        // Nothing is granted here. The plan turns on when Razorpay confirms the
        // first payment over the webhook, so this says what is true so far.
        onPaid: () => setSubscribeNotice('Thank you. Your plan turns on as soon as the payment settles.'),
        onDismissed: () => setSubscribeNotice('No payment was taken.'),
        onFailed: (message) => setSubscribeError(message),
      });
    } catch {
      setSubscribeError('We could not start that subscription. Please try again.');
    } finally {
      setSubscribing(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Seo
        title="Pricing"
        description="Tripician is free to plan with and free to write on. Pro and Business add more room, more Navia and better Story Book prices."
        path="/pricing"
      />

      <Box sx={{ maxWidth: CONTENT_MAX, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 3, md: 5 }, pb: 10 }}>
        <PageHeader
          title="Pricing"
          subtitle="Planning a trip and writing it up are free, and stay free. You pay for room to do more of it."
          action={(
            <SegmentedControl
              value={billing}
              options={BILLING_OPTIONS}
              onChange={(value) => setBilling(value)}
            />
          )}
        />

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            mt: 4,
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          }}
        >
          {plans.map((plan) => (
            <PlanCard
              key={plan.planId}
              plan={plan}
              billing={billing}
              current={myPlanId === plan.planId}
              busy={subscribing === plan.planId}
              onChoose={() => void subscribe(plan)}
            />
          ))}
        </Box>

        {subscribeError && (
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>{subscribeError}</Typography>
        )}
        {subscribeNotice && (
          <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>{subscribeNotice}</Typography>
        )}

        {books.length > 0 && (
          <Box sx={{ mt: 8 }}>
            <Typography variant="h2" sx={{ color: 'text.primary' }}>Story Books</Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, maxWidth: 680 }}>
              A printed book of your trip, made after you have travelled. Bought one at a time,
              not part of any plan. Pro and Business pay a member price for the same book.
            </Typography>

            {/* A struck-through price needs a stated reason next to it, or it is
                just a bigger number printed for effect. */}
            {sale && sale.percent > 0 && (
              <Chip
                color="primary"
                label={`${sale.label ?? 'Sale'}: ${sale.percent}% off${
                  sale.endsAt ? ` until ${new Date(sale.endsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''
                }`}
                sx={{ mt: 2 }}
              />
            )}

            <TableContainer
              sx={{
                mt: 3,
                overflowX: 'auto',
                borderRadius: '16px',
                border: `1px solid ${theme.custom.surface.border}`,
                bgcolor: 'background.paper',
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Pages</TableCell>
                    <TableCell align="right">Basic</TableCell>
                    <TableCell align="right">Pro</TableCell>
                    <TableCell align="right">Business</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {books.map((product) => (
                    <TableRow key={product.pageCount}>
                      <TableCell>{product.pageCount}</TableCell>
                      <TableCell align="right"><SalePrice price={product.retail} sale={sale} /></TableCell>
                      <TableCell align="right" sx={{ color: 'primary.main', fontWeight: 600 }}>
                        <SalePrice price={product.pro} sale={sale} />
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'primary.main', fontWeight: 600 }}>
                        <SalePrice price={product.business} sale={sale} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', mt: 1.5 }}>
              Shipping and taxes are shown separately at checkout. A story prints at the next size
              up from its own length, and the checkout tells you which one before you pay.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};


/**
 * The old price struck through, the new one beside it.
 *
 * Only when a sale is actually running. A permanent strike-through against a
 * price nobody ever paid is the oldest trick in retail and the fastest way to
 * stop being believed.
 */
const SalePrice: React.FC<{ price: number; sale: PublicSale | null }> = ({ price, sale }) => {
  if (!sale || sale.percent <= 0) return <>{formatMoney(price)}</>;

  const discounted = Math.round(price * (100 - sale.percent)) / 100;

  return (
    <Box component="span" sx={{ display: 'inline-flex', gap: 0.75, alignItems: 'baseline' }}>
      <Box component="span" sx={{ textDecoration: 'line-through', color: 'text.disabled', fontWeight: 400 }}>
        {formatMoney(price)}
      </Box>
      <Box component="span">{formatMoney(discounted)}</Box>
    </Box>
  );
};
const PlanCard: React.FC<{
  plan: Plan;
  billing: Billing;
  current: boolean;
  busy: boolean;
  onChoose: () => void;
}> = ({ plan, billing, current, busy, onChoose }) => {
  const theme = useTheme();
  const free = plan.monthlyPrice === 0;
  const price = billing === 'annual' ? plan.annualPrice : plan.monthlyPrice;

  // Only claimed when it is arithmetically true, and shown as the real figure
  // rather than a rounded percentage.
  const annualSaving = plan.monthlyPrice * 12 - plan.annualPrice;

  const limits: string[] = [];
  limits.push(isUnlimited(plan.maxTripMembers)
    ? 'Trip size to suit the organization'
    : `Up to ${plan.maxTripMembers} people on a trip`);
  limits.push(isUnlimited(plan.maxRecruitedTravellers)
    ? 'Recruit travellers at organization scale'
    : `${plan.maxRecruitedTravellers} ${plan.maxRecruitedTravellers === 1 ? 'traveller' : 'travellers'} can join from a public listing`);
  limits.push(`${plan.naviaMonthlyCredits.toLocaleString('en-IN')} Navia credits a month`);
  if (plan.storyBookPriceTier !== 'retail') limits.push('Member price on Story Books');
  if (plan.planId === 'business') limits.push('Bulk Story Book ordering');

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: '18px',
        border: `1px solid ${current ? theme.palette.primary.main : theme.custom.surface.border}`,
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="subtitle1" sx={{ color: 'text.primary' }}>{plan.name}</Typography>
        {current && <Chip size="small" color="primary" label="Your plan" />}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, mt: 1.5 }}>
        <Typography variant="h2" sx={{ color: 'text.primary' }}>
          {free ? 'Free' : formatMoney(price)}
        </Typography>
        {!free && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {billing === 'annual' ? 'a year' : 'a month'}
          </Typography>
        )}
      </Box>

      {!free && billing === 'annual' && annualSaving > 0 && (
        <Typography variant="caption" sx={{ color: 'primary.main', mt: 0.5 }}>
          {formatMoney(annualSaving)} less than paying monthly
        </Typography>
      )}

      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5, minHeight: 44 }}>
        {PITCH[plan.planId]}
      </Typography>

      <Box sx={{ display: 'grid', gap: 0.75, mt: 2.5, flex: 1 }}>
        {[...ALWAYS_FREE, ...limits].map((line) => (
          <Box key={line} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <IconCheck size={16} style={{ marginTop: 2, flexShrink: 0 }} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{line}</Typography>
          </Box>
        ))}
      </Box>

      <Button
        variant={plan.planId === 'pro' ? 'contained' : 'outlined'}
        disabled={current || free || busy}
        onClick={onChoose}
        sx={{ borderRadius: '12px', mt: 3 }}
      >
        {busy ? 'Opening' : current ? 'Your plan' : free ? 'Included' : `Choose ${plan.name.replace('Tripician ', '')}`}
      </Button>
    </Box>
  );
};

export default PricingPage;
