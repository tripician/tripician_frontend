import type { BillingItem, BillingItemStatus, BillingSummary } from './types';

// Billing is shown to the paisa, because it is the figure an accountant or a bank will check.
export function formatRupees(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Dates are India dates. Month names are fixed because browsers disagree about "Sep" and "Sept".
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDay(iso: string): string {
  const [year, month, day] = fileDay(iso).split('-').map(Number);
  return `${day} ${SHORT_MONTHS[month - 1]} ${year}`;
}

export function periodText(start: string | null, end: string | null): string | null {
  return start && end ? `${formatDay(start)} to ${formatDay(end)}` : null;
}

export function statusLabel(status: BillingItemStatus): string {
  switch (status) {
    case 'paid': return 'Paid';
    case 'failed': return 'Failed';
    case 'refund_pending': return 'Refund requested';
    case 'refunded': return 'Refunded';
    case 'partially_refunded': return 'Part refunded';
    default: return status;
  }
}

/** A receipt is for money that was taken. A failed attempt took nothing, so it has none. */
export function canShowReceipt(item: BillingItem): boolean {
  return item.status !== 'failed';
}

function renewsInFuture(summary: BillingSummary, now: Date): boolean {
  return summary.renewsAt !== null && new Date(summary.renewsAt) > now;
}

/** One sentence on where the plan stands. It never claims a charge the records do not show. */
export function planStatusSentence(summary: BillingSummary, now: Date = new Date()): string {
  const { planName, status, renewsAt } = summary;
  const ahead = renewsInFuture(summary, now);

  if (summary.planId === 'basic') return `You are on ${planName}, which is free.`;

  switch (status) {
    case 'active':
      if (!ahead || !renewsAt) return `${planName} is active.`;
      return summary.nextChargeAmount !== null
        ? `Renews on ${formatDay(renewsAt)} for ${formatRupees(summary.nextChargeAmount, summary.currency)}.`
        : `Renews on ${formatDay(renewsAt)}.`;
    case 'pending':
      return 'Your payment is being confirmed by Razorpay. This usually takes a minute.';
    case 'past_due':
      return `A renewal payment failed. We are retrying it, and ${planName} stays on until the last retry fails.`;
    case 'halted':
      return `Renewals stopped after failed retries, so ${planName} has ended. You can subscribe again to start it.`;
    case 'cancelled':
      return ahead && renewsAt
        ? `Cancelled. ${planName} continues until ${formatDay(renewsAt)}, then the account returns to Tripician Basic.`
        : 'Cancelled. The account is on Tripician Basic.';
    case 'completed':
      return `${planName} has finished its full term.`;
    case 'refunded':
      return `${planName} ended after a refund, so the account is on Tripician Basic.`;
    default:
      return `${planName} status: ${status}.`;
  }
}

/** What cancelling does, said before the person confirms it. */
export function cancelRenewalText(summary: BillingSummary, now: Date = new Date()): string {
  return renewsInFuture(summary, now) && summary.renewsAt
    ? `Stops the next renewal. ${summary.planName} stays on until ${formatDay(summary.renewsAt)}, then the account returns to Tripician Basic.`
    : 'Stops the next renewal.';
}

/** The India date as YYYY-MM-DD, for naming a file. */
export function fileDay(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(iso));
}

/** Plain words for a group's plan state, never the raw provider status. */
export function groupStatusLabel(status: string): string {
  switch (status) {
    case 'active': return 'Active';
    case 'pending': return 'Confirming payment';
    case 'past_due': return 'Payment issue';
    case 'halted': return 'Ended';
    case 'cancelled': return 'Cancelled';
    case 'completed': return 'Finished';
    case 'refunded': return 'Refunded';
    default: return 'Not active';
  }
}
