import type { BillingItem, BillingItemStatus, BillingSummary, PaymentIssueKind } from './types';

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

/**
 * The day, or null when the server sent no date or something that is not one.
 * A sentence leaves out the part that needs it rather than printing "Invalid Date".
 */
export function knownDay(iso: string | null | undefined): string | null {
  if (iso == null || iso === '' || Number.isNaN(new Date(iso).getTime())) return null;
  return formatDay(iso);
}

/** A renewal payment failed (still retrying) or failed for good: the plan has nothing paid ahead of it. */
export function isFailedPayment(status: string | null | undefined): boolean {
  return status === 'past_due' || status === 'halted';
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

// `!= null`, never `!== null`: the server leaves nulls out, so a missing date arrives as undefined.
function renewsInFuture(summary: Pick<BillingSummary, 'renewsAt'>, now: Date): boolean {
  return summary.renewsAt != null && new Date(summary.renewsAt) > now;
}

/** One sentence on where the plan stands. It never claims a charge the records do not show. */
export function planStatusSentence(summary: BillingSummary, now: Date = new Date()): string {
  const { planName, status, renewsAt } = summary;
  const ahead = renewsInFuture(summary, now);

  // Asked before the Basic answer below: once a renewal has stopped the plan in force
  // is Basic, and "which is free" would hide why the paid plan went.
  if (status === 'halted' && summary.paymentIssueKind === 'halted') {
    return 'Your Tripician Pro renewal payment failed, so your account is back on Tripician Basic.';
  }
  if (status === 'refunded') return 'Refunded. Your account is on Tripician Basic.';

  if (summary.planId === 'basic') return `You are on ${planName}, which is free.`;

  switch (status) {
    case 'active':
      if (renewsAt == null) return `${planName} is active.`;
      // The paid period ended and the charge has not landed yet: UPI and bank mandates can take a day or two.
      if (!ahead) return 'Your renewal is being processed.';
      return summary.nextChargeAmount != null
        ? `Renews on ${formatDay(renewsAt)} for ${formatRupees(summary.nextChargeAmount, summary.currency)}.`
        : `Renews on ${formatDay(renewsAt)}.`;
    case 'pending':
      return 'Your payment is being confirmed by Razorpay. This usually takes a minute.';
    case 'past_due': {
      const until = knownDay(summary.graceEndsAt);
      return `Your renewal payment didn't go through. ${planName} stays on${until ? ` until ${until}` : ''} while it's retried.`;
    }
    case 'halted':
      return `Renewals stopped after failed retries, so ${planName} has ended. You can subscribe again to start it.`;
    case 'cancelled':
      return ahead && renewsAt
        ? `Cancelled. ${planName} stays on until ${formatDay(renewsAt)}, then your account returns to Tripician Basic. You won't be charged again.`
        : 'Cancelled. The account is on Tripician Basic.';
    case 'completed':
      return ahead && renewsAt
        ? `Your subscription has finished its term. ${planName} stays on until ${formatDay(renewsAt)}, then your account returns to Tripician Basic.`
        : `${planName} has finished its full term.`;
    default:
      return `${planName} status: ${status}.`;
  }
}

/** The plan being cancelled, as much as the dialog needs; a billing summary and a group's subscription both fit. */
export interface CancelSubject {
  planName: string;
  status: string;
  renewsAt?: string | null;
}

/**
 * What cancelling does, said before the person confirms it. `groupName` words it for a group's plan.
 *
 * A failed renewal has no paid time ahead of it, so there it is the whole
 * subscription that stops, now, and nothing is kept.
 */
export function cancelRenewalText(subject: CancelSubject, now: Date = new Date(), groupName?: string | null): string {
  const who = groupName ? 'the group' : 'your account';
  if (isFailedPayment(subject.status)) {
    return `This stops the subscription now. The failed payment won't be taken again, and ${who} returns to Tripician Basic.`;
  }
  return renewsInFuture(subject, now) && subject.renewsAt
    ? `Stops the next renewal. ${subject.planName} stays on until ${formatDay(subject.renewsAt)}, then ${groupName ? 'the group' : 'the account'} returns to Tripician Basic.`
    : 'Stops the next renewal.';
}

/**
 * What to say once a cancel went through, from what the server answered.
 * An older server answers only `cancelled`, so with no date the sentence stops short of one.
 */
export function cancelledMessage(
  result: { cancelled?: boolean; immediate?: boolean; accessUntil?: string | null } | null | undefined,
  planName: string,
  groupName?: string | null,
): string {
  if (result?.immediate === true) {
    return groupName
      ? 'Subscription cancelled. The group is on Tripician Basic.'
      : 'Subscription cancelled. Your account is on Tripician Basic.';
  }
  const until = knownDay(result?.accessUntil);
  return until ? `Renewal cancelled. ${planName} stays on until ${until}.` : 'Renewal cancelled.';
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

/** Shown only when nothing is listed on a paid plan, so a missing charge is never hidden. */
export function missingHistoryNote(summary: BillingSummary, itemCount: number): string | null {
  if (itemCount > 0 || summary.planId === 'basic') return null;
  return 'Payments appear here once Tripician receives Razorpay confirmation. If a charge is missing, email support@tripician.com.';
}

/**
 * Plain words for a group's plan state, never the raw provider status.
 * A halt is a failed payment while it is recent enough to be worth fixing, and simply over after that.
 */
export function groupStatusLabel(status: string, issueKind?: PaymentIssueKind | null): string {
  switch (status) {
    case 'active': return 'Active';
    case 'pending': return 'Confirming payment';
    case 'past_due': return 'Payment failed';
    case 'halted': return issueKind === 'halted' ? 'Payment failed' : 'Ended';
    case 'cancelled': return 'Cancelled';
    case 'completed': return 'Finished';
    case 'refunded': return 'Refunded';
    default: return 'Not active';
  }
}

/** Whether a group's plan is a failed payment someone can still fix, which is shown in the warning colour. */
export function groupPaymentFailing(status: string, issueKind?: PaymentIssueKind | null): boolean {
  return status === 'past_due' || (status === 'halted' && issueKind === 'halted');
}

/**
 * The date line under a group's plan. "Renews" only while it really will, "Ends"
 * once it will not; a failed renewal gets neither, because its notice says what happens.
 */
export function groupPlanDate(state: { status: string; renewsAt?: string | null }, now: Date = new Date()): string | null {
  const day = knownDay(state.renewsAt);
  if (!day) return null;
  if (state.status === 'active') return renewsInFuture(state, now) ? `Renews on ${day}` : null;
  if (state.status === 'cancelled' || state.status === 'completed') return `Ends on ${day}`;
  return null;
}

/**
 * One line beside a personal Pro plan when it is not simply renewing: it runs out
 * on a date and will not renew, or its renewal payment failed.
 */
export function proPlanNote(state: { status: string; renewsAt?: string | null } | null | undefined, now: Date = new Date()): string | null {
  if (!state) return null;
  if (state.status === 'past_due') return 'Payment failed';
  if ((state.status === 'cancelled' || state.status === 'completed') && renewsInFuture(state, now)) {
    return `Pro until ${knownDay(state.renewsAt)} · won't renew`;
  }
  return null;
}
