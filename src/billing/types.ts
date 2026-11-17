/** A renewal payment that is still being retried, or one that failed for good. */
export type PaymentIssueKind = 'past_due' | 'halted';

/**
 * What the Billing tab says about the plan. Money is in the currency given, and dates are UTC instants.
 *
 * The server leaves nulls out, and an older server sends none of the payment-failure
 * fields, so anything optional here may simply be absent. Compare with `!= null`.
 */
export interface BillingSummary {
  /** The plan in force: Basic once a plan stops granting, whatever was paid for. */
  planId: string;
  planName: string;
  status: string;
  /** Paid until. For a failed renewal this is already behind: see `graceEndsAt`. */
  renewsAt?: string | null;
  annual: boolean;
  canCancel: boolean;
  /** The next charge, or the overdue one while a renewal is failing. */
  nextChargeAmount?: number | null;
  currency: string;
  paymentIssue: boolean;
  groups: BillingGroup[];
  /** Past due only: when the plan stops if still unpaid. */
  graceEndsAt?: string | null;
  paymentIssueKind?: PaymentIssueKind | null;
  canChangeCard?: boolean;
  canPayAgain?: boolean;
  failureReason?: string | null;
}

/** A group the signed-in person administers and pays for. */
export interface BillingGroup {
  organizationId: string;
  name: string;
  planName: string;
  status: string;
  renewsAt?: string | null;
  paymentIssueKind?: PaymentIssueKind | null;
  graceEndsAt?: string | null;
}

/**
 * A renewal payment that failed, for the person or for a group they run, from
 * GET /api/subscriptions/payment-issues. Personal first, then groups.
 */
export interface PaymentIssue {
  /** Absent for the person's own plan. */
  organizationId?: string | null;
  groupName?: string | null;
  /** The plan that failed, not the plan in force (which is Basic once it has stopped). */
  planId: string;
  planName: string;
  kind: PaymentIssueKind;
  /** The end of the last period actually paid for. */
  paidUntil?: string | null;
  /** Past due only: when the plan stops unless a payment goes through. */
  graceEndsAt?: string | null;
  failureReason?: string | null;
  /** One cycle's price. */
  amount?: number | null;
  currency: string;
  annual: boolean;
  /** A new card can go on the failing subscription while Razorpay still retries it, and only for a card. */
  canChangeCard: boolean;
  canPayAgain: boolean;
}

export type BillingItemStatus = 'paid' | 'failed' | 'refund_pending' | 'refunded' | 'partially_refunded';

/** One line of payment history, whatever it was for. */
export interface BillingItem {
  id: string;
  kind: 'plan' | 'group_plan' | 'credits' | 'book';
  description: string;
  periodStart: string | null;
  periodEnd: string | null;
  amount: number;
  currency: string;
  status: BillingItemStatus;
  failureReason: string | null;
  reference: string | null;
  occurredAt: string;
  groupName: string | null;
}
