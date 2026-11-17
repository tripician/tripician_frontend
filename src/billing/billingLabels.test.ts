import { describe, it, expect } from 'vitest';
import {
  cancelledMessage,
  cancelRenewalText,
  canShowReceipt,
  fileDay,
  formatDay,
  formatRupees,
  groupPaymentFailing,
  groupPlanDate,
  groupStatusLabel,
  isFailedPayment,
  knownDay,
  missingHistoryNote,
  periodText,
  planStatusSentence,
  proPlanNote,
  statusLabel,
} from './billingLabels';
import type { BillingItem, BillingSummary } from './types';

const NOW = new Date('2026-10-06T06:00:00Z');

const summary = (overrides: Partial<BillingSummary> = {}): BillingSummary => ({
  planId: 'pro',
  planName: 'Tripician Pro',
  status: 'active',
  renewsAt: '2026-11-05T00:00:00Z',
  annual: false,
  canCancel: true,
  nextChargeAmount: 74.5,
  currency: 'INR',
  paymentIssue: false,
  groups: [],
  ...overrides,
});

const item = (overrides: Partial<BillingItem> = {}): BillingItem => ({
  id: 'plan_0123456789abcdef0123456789abcdef',
  kind: 'plan',
  description: 'Tripician Pro, billed monthly',
  periodStart: '2026-10-05T00:00:00Z',
  periodEnd: '2026-11-05T00:00:00Z',
  amount: 74.5,
  currency: 'INR',
  status: 'paid',
  failureReason: null,
  reference: 'pay_TEST001',
  occurredAt: '2026-10-05T10:00:00Z',
  groupName: null,
  ...overrides,
});

describe('formatRupees', () => {
  it('shows paise, always, in the Indian style', () => {
    expect(formatRupees(74.5, 'INR')).toBe('₹74.50');
    expect(formatRupees(1299, 'INR')).toBe('₹1,299.00');
    expect(formatRupees(14999, 'INR')).toBe('₹14,999.00');
  });
});

describe('formatDay', () => {
  it('uses the India date, so a late-night UTC payment lands on the right day', () => {
    // 20:00 UTC on 4 October is 01:30 IST on 5 October.
    expect(formatDay('2026-10-04T20:00:00Z')).toBe('5 Oct 2026');
  });

  it('spells September the way the rest of the product does', () => {
    expect(formatDay('2026-09-05T10:00:00Z')).toBe('5 Sep 2026');
  });

  it('reads a midday UTC instant the same in India', () => {
    expect(formatDay('2026-10-05T10:00:00Z')).toBe('5 Oct 2026');
  });
});

describe('periodText', () => {
  it('describes the period a charge paid for', () => {
    expect(periodText('2026-10-05T00:00:00Z', '2026-11-05T00:00:00Z')).toBe('5 Oct 2026 to 5 Nov 2026');
  });

  it('says nothing when either end is unknown', () => {
    expect(periodText(null, '2026-11-05T00:00:00Z')).toBeNull();
    expect(periodText('2026-10-05T00:00:00Z', null)).toBeNull();
  });
});

describe('statusLabel', () => {
  it('names every state a payment can be in', () => {
    expect(statusLabel('paid')).toBe('Paid');
    expect(statusLabel('failed')).toBe('Failed');
    expect(statusLabel('refunded')).toBe('Refunded');
    expect(statusLabel('refund_pending')).toBe('Refund requested');
    expect(statusLabel('partially_refunded')).toBe('Part refunded');
  });
});

describe('canShowReceipt', () => {
  it('offers a receipt for money taken, and never for a failed attempt', () => {
    expect(canShowReceipt(item())).toBe(true);
    expect(canShowReceipt(item({ status: 'refunded' }))).toBe(true);
    expect(canShowReceipt(item({ status: 'failed' }))).toBe(false);
  });
});

// What the server really sends once a plan stops granting: the plan in force is Basic,
// the paid-until date is behind, and nothing is charged next.
const lapsed = (overrides: Partial<BillingSummary> = {}): BillingSummary => summary({
  planId: 'basic',
  planName: 'Tripician Basic',
  renewsAt: '2026-10-05T00:00:00Z',
  canCancel: false,
  nextChargeAmount: null,
  ...overrides,
});

describe('planStatusSentence', () => {
  it('says when an active plan renews and what it will charge', () => {
    expect(planStatusSentence(summary(), NOW)).toBe('Renews on 5 Nov 2026 for ₹74.50.');
  });

  it('falls back to the date alone when no amount is known', () => {
    expect(planStatusSentence(summary({ nextChargeAmount: null }), NOW)).toBe('Renews on 5 Nov 2026.');
  });

  it('reads a field the server left out as unknown, not as a value', () => {
    // The server omits nulls, so these arrive absent rather than null.
    const omitted = summary();
    delete omitted.nextChargeAmount;
    expect(planStatusSentence(omitted, NOW)).toBe('Renews on 5 Nov 2026.');

    const undated = summary();
    delete undated.renewsAt;
    expect(planStatusSentence(undated, NOW)).toBe('Tripician Pro is active.');
  });

  it('says a renewal whose date has passed is being processed, not that it renews in the past', () => {
    expect(planStatusSentence(summary({ renewsAt: '2026-10-05T00:00:00Z' }), NOW)).toBe('Your renewal is being processed.');
  });

  it('keeps a cancelled plan on until the paid date, and says nothing more will be charged', () => {
    expect(planStatusSentence(summary({ status: 'cancelled', canCancel: false, nextChargeAmount: null }), NOW)).toBe(
      "Cancelled. Tripician Pro stays on until 5 Nov 2026, then your account returns to Tripician Basic. You won't be charged again.",
    );
  });

  it('says a cancelled plan with no paid time left is already on Basic', () => {
    expect(planStatusSentence(summary({ status: 'cancelled', renewsAt: '2026-09-01T00:00:00Z' }), NOW)).toBe(
      'Cancelled. The account is on Tripician Basic.',
    );
    expect(planStatusSentence(lapsed({ status: 'cancelled' }), NOW)).toBe('You are on Tripician Basic, which is free.');
  });

  it('keeps a plan that finished its term on until the paid date', () => {
    expect(planStatusSentence(summary({ status: 'completed', canCancel: false, nextChargeAmount: null }), NOW)).toBe(
      'Your subscription has finished its term. Tripician Pro stays on until 5 Nov 2026, then your account returns to Tripician Basic.',
    );
  });

  it('names the day a failing renewal stops', () => {
    const failing = summary({
      status: 'past_due',
      paymentIssue: true,
      paymentIssueKind: 'past_due',
      renewsAt: '2026-10-04T18:30:00Z',
      graceEndsAt: '2026-10-08T18:30:00Z',
      canChangeCard: true,
      canPayAgain: true,
    });
    expect(planStatusSentence(failing, NOW)).toBe(
      "Your renewal payment didn't go through. Tripician Pro stays on until 9 Oct 2026 while it's retried.",
    );
  });

  it('leaves the stop date out when an older server sends none', () => {
    expect(planStatusSentence(summary({ status: 'past_due', paymentIssue: true, renewsAt: '2026-10-04T18:30:00Z' }), NOW)).toBe(
      "Your renewal payment didn't go through. Tripician Pro stays on while it's retried.",
    );
  });

  it('says why a halted plan is on Basic, before the Basic sentence can hide it', () => {
    const halted = lapsed({ status: 'halted', paymentIssue: true, paymentIssueKind: 'halted', canCancel: true, canPayAgain: true });
    expect(planStatusSentence(halted, NOW)).toBe(
      'Your Tripician Pro renewal payment failed, so your account is back on Tripician Basic.',
    );
  });

  it('reads an old halt, or one from an older server, as plain Basic', () => {
    expect(planStatusSentence(lapsed({ status: 'halted' }), NOW)).toBe('You are on Tripician Basic, which is free.');
  });

  it('says a refunded plan was refunded rather than that it is free', () => {
    expect(planStatusSentence(lapsed({ status: 'refunded' }), NOW)).toBe('Refunded. Your account is on Tripician Basic.');
  });

  it('never claims nothing was charged, because a Basic account can have paid before', () => {
    const basic = summary({ planId: 'basic', planName: 'Tripician Basic', status: 'cancelled', renewsAt: null });
    const sentence = planStatusSentence(basic, NOW);
    expect(sentence).toBe('You are on Tripician Basic, which is free.');
    expect(sentence.toLowerCase()).not.toContain('nothing has been charged');
  });

  it('is honest about a state it does not recognise', () => {
    expect(planStatusSentence(summary({ status: 'mystery' }), NOW)).toBe('Tripician Pro status: mystery.');
  });
});

describe('cancelRenewalText', () => {
  it('states the date the paid time runs out', () => {
    expect(cancelRenewalText(summary(), NOW)).toBe(
      'Stops the next renewal. Tripician Pro stays on until 5 Nov 2026, then the account returns to Tripician Basic.',
    );
  });

  it('does not promise access past a date that has gone', () => {
    expect(cancelRenewalText(summary({ renewsAt: null }), NOW)).toBe('Stops the next renewal.');
  });

  it('says a failed renewal stops now, with no unpaid time kept', () => {
    const expected = "This stops the subscription now. The failed payment won't be taken again, and your account returns to Tripician Basic.";
    expect(cancelRenewalText(summary({ status: 'past_due', renewsAt: '2026-10-04T18:30:00Z' }), NOW)).toBe(expected);
    expect(cancelRenewalText(lapsed({ status: 'halted' }), NOW)).toBe(expected);
  });

  it('words a group\'s plan for the group', () => {
    const club = { planName: 'Tripician Club', status: 'active', renewsAt: '2026-11-05T00:00:00Z' };
    expect(cancelRenewalText(club, NOW, 'Trail Club')).toBe(
      'Stops the next renewal. Tripician Club stays on until 5 Nov 2026, then the group returns to Tripician Basic.',
    );
    expect(cancelRenewalText({ ...club, status: 'halted' }, NOW, 'Trail Club')).toBe(
      "This stops the subscription now. The failed payment won't be taken again, and the group returns to Tripician Basic.",
    );
  });
});

describe('cancelledMessage', () => {
  it('names the day paid time runs to when there is some left', () => {
    expect(cancelledMessage({ immediate: false, accessUntil: '2026-11-05T00:00:00Z' }, 'Tripician Pro')).toBe(
      'Renewal cancelled. Tripician Pro stays on until 5 Nov 2026.',
    );
  });

  it('says the account is on Basic when the plan stopped there and then', () => {
    expect(cancelledMessage({ immediate: true }, 'Tripician Pro')).toBe(
      'Subscription cancelled. Your account is on Tripician Basic.',
    );
    expect(cancelledMessage({ immediate: true }, 'Tripician Club', 'Trail Club')).toBe(
      'Subscription cancelled. The group is on Tripician Basic.',
    );
  });

  it('stops short of a date an older server did not send', () => {
    expect(cancelledMessage({ cancelled: true }, 'Tripician Pro')).toBe('Renewal cancelled.');
    expect(cancelledMessage(undefined, 'Tripician Pro')).toBe('Renewal cancelled.');
  });
});

describe('isFailedPayment', () => {
  it('is a renewal that failed, retrying or not, and nothing else', () => {
    expect(isFailedPayment('past_due')).toBe(true);
    expect(isFailedPayment('halted')).toBe(true);
    for (const status of ['active', 'pending', 'cancelled', 'none', 'completed', 'refunded', undefined]) {
      expect(isFailedPayment(status)).toBe(false);
    }
  });
});

describe('knownDay', () => {
  it('formats a date and refuses what is not one', () => {
    expect(knownDay('2026-10-04T20:00:00Z')).toBe('5 Oct 2026');
    expect(knownDay(undefined)).toBeNull();
    expect(knownDay(null)).toBeNull();
    expect(knownDay('')).toBeNull();
    expect(knownDay('soon')).toBeNull();
  });
});

describe('groupPlanDate', () => {
  it('says renews only while the plan will renew', () => {
    expect(groupPlanDate({ status: 'active', renewsAt: '2026-11-05T00:00:00Z' }, NOW)).toBe('Renews on 5 Nov 2026');
    expect(groupPlanDate({ status: 'active', renewsAt: '2026-10-05T00:00:00Z' }, NOW)).toBeNull();
  });

  it('says ends for a plan that will not renew', () => {
    expect(groupPlanDate({ status: 'cancelled', renewsAt: '2026-11-05T00:00:00Z' }, NOW)).toBe('Ends on 5 Nov 2026');
    expect(groupPlanDate({ status: 'completed', renewsAt: '2026-11-05T00:00:00Z' }, NOW)).toBe('Ends on 5 Nov 2026');
  });

  it('gives a failed renewal no date line, because its notice says what happens', () => {
    expect(groupPlanDate({ status: 'past_due', renewsAt: '2026-10-04T18:30:00Z' }, NOW)).toBeNull();
    expect(groupPlanDate({ status: 'halted', renewsAt: '2026-10-04T18:30:00Z' }, NOW)).toBeNull();
    expect(groupPlanDate({ status: 'active' }, NOW)).toBeNull();
  });
});

describe('proPlanNote', () => {
  it('says plainly when Pro runs out and will not renew', () => {
    expect(proPlanNote({ status: 'cancelled', renewsAt: '2026-11-05T00:00:00Z' }, NOW)).toBe("Pro until 5 Nov 2026 · won't renew");
  });

  it('says a renewal payment failed', () => {
    expect(proPlanNote({ status: 'past_due', renewsAt: '2026-10-04T18:30:00Z' }, NOW)).toBe('Payment failed');
  });

  it('says nothing for a plan that simply renews, or when nothing is known', () => {
    expect(proPlanNote({ status: 'active', renewsAt: '2026-11-05T00:00:00Z' }, NOW)).toBeNull();
    expect(proPlanNote({ status: 'cancelled', renewsAt: '2026-09-01T00:00:00Z' }, NOW)).toBeNull();
    expect(proPlanNote(null, NOW)).toBeNull();
  });
});

describe('fileDay', () => {
  it('names the file with the India date', () => {
    expect(fileDay('2026-10-04T20:00:00Z')).toBe('2026-10-05');
  });
});

describe('groupStatusLabel', () => {
  it('turns provider states into words a group admin can act on', () => {
    expect(groupStatusLabel('active')).toBe('Active');
    expect(groupStatusLabel('past_due')).toBe('Payment failed');
    expect(groupStatusLabel('past_due', 'past_due')).toBe('Payment failed');
    expect(groupStatusLabel('refunded')).toBe('Refunded');
    expect(groupStatusLabel('something_new')).toBe('Not active');
  });

  it('calls a recent halt a failed payment, and an old one simply ended', () => {
    expect(groupStatusLabel('halted', 'halted')).toBe('Payment failed');
    expect(groupStatusLabel('halted')).toBe('Ended');
    expect(groupStatusLabel('halted', null)).toBe('Ended');
  });
});

describe('groupPaymentFailing', () => {
  it('marks only a failed payment that can still be fixed', () => {
    expect(groupPaymentFailing('past_due')).toBe(true);
    expect(groupPaymentFailing('halted', 'halted')).toBe(true);
    expect(groupPaymentFailing('halted')).toBe(false);
    expect(groupPaymentFailing('active')).toBe(false);
    expect(groupPaymentFailing('cancelled')).toBe(false);
  });
});

describe('missingHistoryNote', () => {
  it('says nothing for a free account, which may simply have no payments', () => {
    expect(missingHistoryNote(summary({ planId: 'basic', planName: 'Tripician Basic', status: 'none', renewsAt: null, nextChargeAmount: null }), 0)).toBeNull();
  });

  it('explains how a missing charge is handled on a paid plan with nothing listed', () => {
    expect(missingHistoryNote(summary(), 0)).toBe(
      'Payments appear here once Tripician receives Razorpay confirmation. If a charge is missing, email support@tripician.com.',
    );
  });

  it('says nothing once there is something to read', () => {
    expect(missingHistoryNote(summary(), 1)).toBeNull();
  });
});
