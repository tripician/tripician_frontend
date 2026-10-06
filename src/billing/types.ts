/** What the Billing tab says about the plan. Money is in the currency given, and dates are UTC instants. */
export interface BillingSummary {
  planId: string;
  planName: string;
  status: string;
  renewsAt: string | null;
  annual: boolean;
  canCancel: boolean;
  nextChargeAmount: number | null;
  currency: string;
  paymentIssue: boolean;
  groups: BillingGroup[];
}

/** A group the signed-in person administers and pays for. */
export interface BillingGroup {
  organizationId: string;
  name: string;
  planName: string;
  status: string;
  renewsAt: string | null;
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
