/**
 * /pricing , the plans, and what each one costs.
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
import { Box, Button, Chip, CircularProgress, Typography, useTheme } from '@mui/material';
import { IconCheck } from '@tabler/icons-react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { planBenefits } from './planBenefits';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import Seo from '../components/Seo';
import PageHeader from '../components/ui/PageHeader';
import SegmentedControl from '../components/ui/SegmentedControl';
import { loadRazorpay, openRazorpaySubscription } from '../afterstory/book/razorpay';
import SalePrice from './SalePrice';
import { saleLabel, strikePrice } from './planSale';
import { CARD_SAVING_NOTE } from './billingCopy';
import { waitForPlan } from './planActivation';
import { approximateLabel, conversionNote, regionOf, visitorCurrency, type DisplayRates } from './localPrice';
import { formatMoney, type Plan, type PlanId, type PlanSale } from './types';

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
  club: 'For clubs and travel communities: no member cap, managers, and TripicianAI credits the group shares.',
  business: 'For agencies, trekking groups and travel communities running trips.',
};

/** Free on every plan, said out loud on every card. */
const ALWAYS_FREE = ['Trip planning', 'Advanced planning', 'After Story'];

/** The server's own words for why it said no. Refusals arrive as `message` or `error`, from a thrown axios error or a plain response. */
function refusalMessage(source: unknown): string | undefined {
  const body = (source as { response?: { data?: unknown }; data?: unknown })?.response?.data
    ?? (source as { data?: unknown })?.data;
  const text = (body as { message?: unknown; error?: unknown })?.message
    ?? (body as { error?: unknown })?.error;
  return typeof text === 'string' && text.trim() ? text.trim() : undefined;
}

const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuthToken();

  const [billing, setBilling] = React.useState<Billing>('monthly');
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [sale, setSale] = React.useState<PlanSale | null>(null);
  const [rates, setRates] = React.useState<DisplayRates | null>(null);
  const [myPlanId, setMyPlanId] = React.useState<PlanId | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    apiServices.getPlans()
      .then((planResp) => {
        if (cancelled) return;
        setPlans(Array.isArray(planResp.data?.plans) ? planResp.data.plans : []);
        setSale(planResp.data?.sale ?? null);
        setRates(planResp.data?.display ?? null);
      })
      .catch(() => { if (!cancelled) { setPlans([]); setSale(null); setRates(null); } })
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

  // Rupees unless the browser says where it is and the server sent a rate for there.
  const local = React.useMemo(
    () => visitorCurrency(regionOf(typeof navigator === 'undefined' ? [] : navigator.languages), rates),
    [rates],
  );

  const [subscribing, setSubscribing] = React.useState<PlanId | null>(null);
  // One message at a time: a declined card and a later success must never sit side by side.
  const [outcome, setOutcome] = React.useState<{ tone: 'error' | 'info'; text: string } | null>(null);
  const fail = (text: string) => setOutcome({ tone: 'error', text });

  // A payment is confirmed after the sheet closes, so nothing may navigate once the buyer has left this page.
  const onPage = React.useRef(true);
  React.useEffect(() => {
    onPage.current = true;
    return () => { onPage.current = false; };
  }, []);

  // Waits for the plan to really turn on, then takes the buyer home with one clear line.
  const settle = async (plan: Plan, bearer: string) => {
    setSubscribing(plan.planId);
    setOutcome({ tone: 'info', text: 'Payment received. Turning on your plan.' });

    const active = await waitForPlan({
      read: async () => (await apiServices.getMyPlan(bearer)).data?.planId,
      wanted: plan.planId,
    });

    if (!onPage.current) return;
    navigate('/', { state: { planWelcome: { planName: plan.name, active } } });
  };

  // Club and Business belong to a group, so they are chosen from that group's settings: this page cannot know which group.
  const subscribe = async (plan: Plan) => {
    if (plan.monthlyPrice === 0) return;
    if (!token) { navigate('/signin'); return; }
    if (plan.scope === 'organization') { navigate('/groups'); return; }

    setSubscribing(plan.planId);
    setOutcome(null);

    try {
      const scriptReady = await loadRazorpay();
      if (!scriptReady) {
        fail('The payment window could not load. Check your connection and try again.');
        return;
      }

      const intent = await apiServices.createSubscription(token, {
        planId: plan.planId,
        annual: billing === 'annual',
      });

      // For a 2xx that still says no. The server refuses with a 400 today, but a refusal is a refusal whichever status carries it.
      if (!intent.data?.ok) {
        fail(refusalMessage(intent) ?? 'That plan could not be opened for payment.');
        return;
      }

      // Once a payment has gone through, nothing the sheet says afterwards may overwrite that.
      let paid = false;
      openRazorpaySubscription({
        keyId: intent.data.keyId,
        subscriptionId: intent.data.subscriptionId,
        description: intent.data.description ?? plan.name,
        payer: { name: intent.data.customerName, email: intent.data.customerEmail, phone: intent.data.customerPhone },
        // Nothing is granted here: the webhook turns the plan on, so the page waits for that before saying so.
        onPaid: () => { paid = true; void settle(plan, token); },
        // A failed attempt has already said why, which is worth more than this line.
        onDismissed: () => { if (!paid) setOutcome((current) => (current?.tone === 'error' ? current : { tone: 'info', text: 'No payment was taken.' })); },
        onFailed: (message) => { if (!paid) fail(message); },
      });
    } catch (err) {
      // Refusals are 400s, so they land here. Saying "try again" threw away the reason the server wrote.
      fail(refusalMessage(err) ?? 'We could not start that subscription. Please try again.');
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
        description="Tripician is free to plan with and free to write on. Pro and Business add more room to plan, and more TripicianAI."
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
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: `repeat(${Math.max(plans.length, 1)}, minmax(0, 1fr))` },
          }}
        >
          {plans.map((plan) => (
            <PlanCard
              key={plan.planId}
              plan={plan}
              sale={sale}
              billing={billing}
              local={local}
              rates={rates}
              current={myPlanId === plan.planId}
              busy={subscribing === plan.planId}
              onChoose={() => void subscribe(plan)}
            />
          ))}
        </Box>

        {conversionNote(local, 'INR', rates) && (
          <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'text.secondary', maxWidth: 680 }}>
            {conversionNote(local, 'INR', rates)}
          </Typography>
        )}

        {outcome && (
          <Typography
            variant="body2"
            role={outcome.tone === 'error' ? 'alert' : 'status'}
            sx={{ mt: 2, color: outcome.tone === 'error' ? 'error.main' : 'text.secondary' }}
          >
            {outcome.text}
          </Typography>
        )}

        <Typography variant="body2" sx={{ mt: 3, color: 'text.secondary', maxWidth: 680 }}>
          Subscriptions renew automatically until you cancel. Cancel within 7 days of a payment and
          we refund it in full; after that, cancelling stops the next renewal rather than refunding
          the period you are in.{' '}
          <Box
            component={RouterLink}
            to="/terms-and-conditions#billing"
            sx={{ color: 'primary.main', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            Billing and refund terms
          </Box>
        </Typography>

        {/* Said before the sheet opens, so a forced save-card tick does not read as something Tripician chose. */}
        <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary', maxWidth: 680 }}>
          {CARD_SAVING_NOTE}
        </Typography>

      </Box>
    </Box>
  );
};


const PlanCard: React.FC<{
  plan: Plan;
  sale: PlanSale | null;
  billing: Billing;
  local: string | null;
  rates: DisplayRates | null;
  current: boolean;
  busy: boolean;
  onChoose: () => void;
}> = ({ plan, sale, billing, local, rates, current, busy, onChoose }) => {
  const theme = useTheme();
  const free = plan.monthlyPrice === 0;
  const price = billing === 'annual' ? plan.annualPrice : plan.monthlyPrice;
  // The server already applied the sale, so the MRP is what the strike-through needs.
  // A plan the sale does not move shows one number, however loudly the sale is running.
  const mrp = billing === 'annual' ? plan.annualMrp : plan.monthlyMrp;
  const struck = strikePrice(mrp, price);

  // Only claimed when it is arithmetically true, and shown as the real figure
  // rather than a rounded percentage.
  const annualSaving = plan.monthlyPrice * 12 - plan.annualPrice;

  // Shared with the Pro popup and the landing comparison, so three surfaces
  // cannot describe the same plan three different ways.
  const limits = planBenefits(plan);

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

      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, mt: 1.5, flexWrap: 'wrap' }}>
        <Typography variant="h2" sx={{ color: 'text.primary' }}>
          {free ? 'Free' : struck !== null ? <SalePrice mrp={struck} payable={price} /> : formatMoney(price)}
        </Typography>
        {!free && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {billing === 'annual' ? 'a year' : 'a month'}
          </Typography>
        )}
      </Box>

      {/* What the price feels like outside India. Never the amount charged, so it says approximately. */}
      {!free && approximateLabel(price, local, rates) && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {approximateLabel(price, local, rates)} {billing === 'annual' ? 'a year' : 'a month'}
        </Typography>
      )}

      {/* A struck-through price needs a stated reason next to it, or it is just
          a bigger number printed for effect. */}
      {saleLabel(sale?.label, mrp, price) && (
        <Chip size="small" color="primary" variant="outlined" label={saleLabel(sale?.label, mrp, price)} sx={{ mt: 1, alignSelf: 'flex-start', fontWeight: 700 }} />
      )}

      {!free && billing === 'annual' && annualSaving > 0 && (
        <Typography variant="caption" sx={{ color: 'primary.main', mt: 0.5 }}>
          {formatMoney(annualSaving)} less than paying monthly
        </Typography>
      )}

      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5, minHeight: 44 }}>
        {PITCH[plan.planId]}
      </Typography>

      <Box sx={{ display: 'grid', gap: 0.75, mt: 2.5, flex: 1, alignContent: 'start' }}>
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
