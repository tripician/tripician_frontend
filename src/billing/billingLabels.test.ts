import { describe, it, expect } from 'vitest';
import {
  cancelRenewalText,
  canShowReceipt,
  fileDay,
  formatDay,
  formatRupees,
  groupStatusLabel,
  missingHistoryNote,
  periodText,
  planStatusSentence,
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

describe('planStatusSentence', () => {
  it('says when an active plan renews and what it will charge', () => {
    expect(planStatusSentence(summary(), NOW)).toBe('Renews on 5 Nov 2026 for ₹74.50.');
  });

  it('falls back to the date alone when no amount is known', () => {
    expect(planStatusSentence(summary({ nextChargeAmount: null }), NOW)).toBe('Renews on 5 Nov 2026.');
  });

  it('keeps a cancelled plan on until the paid date', () => {
    expect(planStatusSentence(summary({ status: 'cancelled' }), NOW)).toBe(
      'Cancelled. Tripician Pro continues until 5 Nov 2026, then the account returns to Tripician Basic.',
    );
  });

  it('says a cancelled plan with no paid time left is already on Basic', () => {
    expect(planStatusSentence(summary({ status: 'cancelled', renewsAt: '2026-09-01T00:00:00Z' }), NOW)).toBe(
      'Cancelled. The account is on Tripician Basic.',
    );
  });

  it('tells a failing renewal that access continues while it is retried', () => {
    expect(planStatusSentence(summary({ status: 'past_due', paymentIssue: true }), NOW)).toBe(
      'A renewal payment failed. We are retrying it, and Tripician Pro stays on until the last retry fails.',
    );
  });

  it('says a halted plan has ended without blaming the buyer', () => {
    expect(planStatusSentence(summary({ status: 'halted' }), NOW)).toBe(
      'Renewals stopped after failed retries, so Tripician Pro has ended. You can subscribe again to start it.',
    );
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
});

describe('fileDay', () => {
  it('names the file with the India date', () => {
    expect(fileDay('2026-10-04T20:00:00Z')).toBe('2026-10-05');
  });
});

describe('groupStatusLabel', () => {
  it('turns provider states into words a group admin can act on', () => {
    expect(groupStatusLabel('active')).toBe('Active');
    expect(groupStatusLabel('past_due')).toBe('Payment issue');
    expect(groupStatusLabel('halted')).toBe('Ended');
    expect(groupStatusLabel('refunded')).toBe('Refunded');
    expect(groupStatusLabel('something_new')).toBe('Not active');
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
