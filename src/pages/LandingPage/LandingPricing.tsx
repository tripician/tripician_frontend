import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconCheck, IconMinus } from '@tabler/icons-react';
import { apiServices } from '../../services/APIs/apiServices';
import { formatMoney, isUnlimited } from '../../pricing/types';
import type { Plan, PlanId } from '../../pricing/types';

/**
 * The plans, side by side, built from the same configuration the product bills
 * against.
 *
 * Nothing here is written down twice. Prices, limits and credits come from
 * /api/pricing/plans, so a number changed in appsettings changes this with it
 * and the page can never quote a price the checkout does not honour. The whole
 * section refuses to render if that call fails, because a pricing table that
 * has guessed is worse than no pricing table.
 *
 * Business is present as what it is: an organisation plan. It is not a bigger
 * personal plan and saying so up front is cheaper than a refund later.
 */

const PITCH: Record<PlanId, string> = {
  basic: 'Everything you need to plan a real trip, write it up and keep it.',
  pro: 'For people who travel often, plan with others and print what they wrote.',
  business: 'For agencies, trekking outfits and travel communities running trips for other people.',
};

/**
 * The comparison rows.
 *
 * Chosen so every cell is answerable from a plan field. A row nobody can fill
 * from the data is a row that will eventually be wrong.
 */
const ROWS: Array<{ label: string; value: (p: Plan) => string | boolean }> = [
  {
    label: 'People on a trip',
    value: (p) => (isUnlimited(p.maxTripMembers) ? 'No limit' : `Up to ${p.maxTripMembers}`),
  },
  {
    label: 'Travellers who can join from a public listing',
    value: (p) => (isUnlimited(p.maxRecruitedTravellers) ? 'No limit' : String(p.maxRecruitedTravellers)),
  },
  {
    label: 'Navia credits each month',
    value: (p) => p.naviaMonthlyCredits.toLocaleString('en-IN'),
  },
  {
    label: 'Member price on Story Books',
    value: (p) => p.storyBookPriceTier !== 'retail',
  },
  {
    label: 'Plan, publish and write after stories',
    value: () => true,
  },
  {
    label: 'Post to the community as an organization',
    value: (p) => (p.features ?? []).includes('organization_posts'),
  },
  {
    label: 'Staff your own trips from one screen',
    value: (p) => (p.features ?? []).includes('organization_staffing'),
  },
  {
    label: 'Managers who run trips without running the business',
    value: (p) => (p.features ?? []).includes('organization_manager_role'),
  },
];

const Cell: React.FC<{ value: string | boolean }> = ({ value }) => {
  if (value === true) {
    return (
      <span className="lp-plans__yes" aria-label="Included">
        <IconCheck size={16} stroke={2.4} aria-hidden="true" />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="lp-plans__no" aria-label="Not included">
        <IconMinus size={16} stroke={2} aria-hidden="true" />
      </span>
    );
  }
  return <span className="lp-plans__val">{value}</span>;
};

const LandingPricing: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [currency, setCurrency] = useState('INR');
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    let active = true;
    apiServices.getPlans()
      .then((r) => {
        if (!active) return;
        const list = Array.isArray(r.data?.plans) ? r.data.plans : [];
        setPlans(list.length > 0 ? list : null);
        setCurrency(r.data?.currency ?? 'INR');
      })
      // Silence rather than a placeholder table. A price is the one thing on
      // this page that must never be invented.
      .catch(() => { if (active) setPlans(null); });
    return () => { active = false; };
  }, []);

  if (!plans) return null;

  const ordered = ['basic', 'pro', 'business']
    .map((id) => plans.find((p) => p.planId === id))
    .filter((p): p is Plan => Boolean(p));

  return (
    <section className="lp-plans" id="pricing">
      <div className="lp-shell">
        <div className="lp-sec-head">
          <span className="lp-kicker">Plans</span>
          <h2 className="lp-h2">Free to plan. Pay when it earns its place.</h2>
          <p className="lp-lede">
            Planning a trip, publishing it and writing it up afterwards are free and stay
            free. The paid plans exist for people who travel often, and for businesses
            running trips for other people.
          </p>
        </div>

        <div className="lp-plans__billing" role="group" aria-label="Billing period">
          <button
            type="button"
            className={`lp-plans__period${annual ? '' : ' is-on'}`}
            onClick={() => setAnnual(false)}
            aria-pressed={!annual}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`lp-plans__period${annual ? ' is-on' : ''}`}
            onClick={() => setAnnual(true)}
            aria-pressed={annual}
          >
            Yearly
          </button>
        </div>

        <div className="lp-plans__grid">
          {ordered.map((plan) => {
            const price = annual ? plan.annualPrice : plan.monthlyPrice;
            // Only claimed when it is arithmetically true, and shown as the real
            // figure rather than a rounded percentage.
            const saving = plan.monthlyPrice * 12 - plan.annualPrice;
            const featured = plan.planId === 'pro';

            return (
              <article
                key={plan.planId}
                className={`lp-plan${featured ? ' lp-plan--featured' : ''}`}
              >
                {featured && <span className="lp-plan__tag">Most chosen</span>}

                <h3 className="lp-h3">{plan.name}</h3>
                <p className="lp-plan__pitch">{PITCH[plan.planId]}</p>

                <p className="lp-plan__price">
                  {price === 0 ? 'Free' : formatMoney(price, currency)}
                  {price > 0 && (
                    <span className="lp-plan__per">{annual ? ' a year' : ' a month'}</span>
                  )}
                </p>

                {annual && saving > 0 && (
                  <p className="lp-plan__saving">
                    {formatMoney(saving, currency)} less than paying monthly
                  </p>
                )}

                {plan.scope === 'organization' && (
                  <p className="lp-plan__scope">Applies to an organization, not a personal account</p>
                )}

                <button
                  type="button"
                  className={`lp-btn ${featured ? 'lp-btn--primary' : 'lp-btn--outline'} lp-plan__cta`}
                  onClick={() => navigate(plan.monthlyPrice === 0 ? '/signup' : '/pricing')}
                >
                  {plan.monthlyPrice === 0 ? 'Start free' : `Choose ${plan.name.replace('Tripician ', '')}`}
                </button>
              </article>
            );
          })}
        </div>

        <div className="lp-plans__table-wrap">
          <table className="lp-plans__table">
            <caption className="lp-plans__caption">What each plan carries</caption>
            <thead>
              <tr>
                <th scope="col">&nbsp;</th>
                {ordered.map((p) => (
                  <th scope="col" key={p.planId}>{p.name.replace('Tripician ', '')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {ordered.map((p) => (
                    <td key={p.planId}><Cell value={row.value(p)} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="lp-plans__note">
          Story Books are bought one at a time and are not part of a plan. Paid plans pay a
          member price on them. Nothing here takes a payment for a trip: when travellers
          share costs, they settle it between themselves.
        </p>
      </div>
    </section>
  );
};

export default LandingPricing;
