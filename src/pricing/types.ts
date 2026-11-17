import type { DisplayRates } from './localPrice';
import type { PaymentIssueKind } from '../billing/types';

export type PlanId = 'basic' | 'pro' | 'club' | 'business';

export interface Plan {
  planId: PlanId;
  name: string;
  /** "user" or "organization". Business is never a personal plan. */
  scope: 'user' | 'organization';
  /** What is payable now, with any sale already applied by the server. */
  monthlyPrice: number;
  annualPrice: number;
  /**
   * The price before the sale. Equal to the payable price when nothing is running.
   *
   * Optional because a server that predates admin pricing sends neither, and a
   * missing MRP must read as "no sale" rather than as a free plan.
   */
  monthlyMrp?: number;
  annualMrp?: number;
  /**
   * No limit. Business is configured that way on purpose.
   *
   * Optional as well as nullable: the API omits null properties entirely, so an
   * unlimited plan arrives with the field absent rather than set to null.
   */
  maxTripMembers?: number | null;
  maxRecruitedTravellers?: number | null;
  /** How many people a group on this plan may hold. Only meaningful on Basic and on group plans. */
  maxGroupMembers?: number | null;
  tripicianAIMonthlyCredits: number;
  /**
   * Named capabilities this plan unlocks, from appsettings. Absent on plans that
   * unlock none, so read it through `planBenefits` rather than indexing it.
   */
  features?: string[];
  /**
   * Listed but not sold yet (appsettings `ComingSoon`): shown with a "Coming soon" tag and a
   * disabled button. The server refuses its checkout either way. Absent means on sale.
   */
  comingSoon?: boolean;
}

export interface PlanList {
  currency: string;
  plans: Plan[];
  /** A sale running on subscriptions now, or null. The server has already applied it to each price. */
  sale?: PlanSale | null;
  /** Rates for showing an approximate local price. Absent when none could be read. */
  display?: DisplayRates | null;
}

/**
 * The discount running on plans now.
 *
 * No percentage: a prepared discount holds two real prices, and the saving on a
 * monthly plan is rarely the same as on an annual one, so one number here would
 * be wrong for one of them. The UI works each out from the MRP beside it.
 */
export interface PlanSale {
  label: string | null;
  endsAt: string | null;
}

/** Indian formatting, because every price in the system is charged in rupees. */
export const formatMoney = (amount: number, currency = 'INR'): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);

/** Absent and null both mean "no limit here", and the API sends absent. */
export const isUnlimited = (limit: number | null | undefined): boolean =>
  limit === null || limit === undefined;

export type PlanStatus =
  | 'none' | 'pending' | 'active' | 'past_due' | 'halted' | 'cancelled' | 'completed' | 'refunded';

/**
 * Where somebody stands with their subscription.
 *
 * The server leaves nulls out, and an older one sends none of the payment-failure
 * fields, so everything optional here may be absent rather than null.
 */
export interface SubscriptionState {
  /** The plan in force: Basic once the subscription stops granting. */
  planId: PlanId;
  status: PlanStatus;
  /** Paid until. For a failed renewal this is already behind: see `graceEndsAt`. */
  renewsAt?: string | null;
  annual: boolean;
  canCancel: boolean;
  /** Past due only: when the plan stops if still unpaid. */
  graceEndsAt?: string | null;
  paymentIssue?: PaymentIssueKind | null;
  canChangeCard?: boolean;
  canPayAgain?: boolean;
  failureReason?: string | null;
}

/** What cancelling did. An older server sends only `cancelled`. */
export interface SubscriptionCancelResult {
  cancelled: boolean;
  /** True when the plan stopped there and then, with no paid time left to run. */
  immediate?: boolean;
  /** The paid time that still runs, when there is some. */
  accessUntil?: string | null;
}

/** What the browser needs to open the recurring payment sheet. */
export interface SubscriptionIntent {
  ok: boolean;
  error: string | null;
  keyId: string;
  subscriptionId: string;
  planId: PlanId;
  annual: boolean;
  amount: number;
  currency: string;
  description: string | null;
  /** The signed-in buyer's own details, so the payment sheet opens as them. */
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  /** The existing subscription, opened to take a new card rather than to start one. */
  cardChange?: boolean;
}
