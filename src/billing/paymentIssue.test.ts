import { describe, it, expect } from 'vitest';
import {
  asPaymentIssues,
  asSnoozes,
  issueBillingPath,
  paymentNotice,
  pickIssueToShow,
  routeIssueContext,
  snoozeIssue,
  snoozeKey,
  SNOOZE_MS,
  type IssueContext,
} from './paymentIssue';
import type { PaymentIssue } from './types';

// Razorpay's dates are midnight in India: the renewal was due on 9 Nov, and the four days' grace end on 13 Nov.
const PAID_UNTIL = '2026-11-08T18:30:00Z';
const GRACE_ENDS = '2026-11-12T18:30:00Z';
const NOW = new Date('2026-11-10T06:00:00Z');

// As the server sends it: nulls are left out, so a personal issue has no organizationId at all.
const personal = (overrides: Partial<PaymentIssue> = {}): PaymentIssue => ({
  planId: 'pro',
  planName: 'Tripician Pro',
  kind: 'past_due',
  paidUntil: PAID_UNTIL,
  graceEndsAt: GRACE_ENDS,
  amount: 199,
  currency: 'INR',
  annual: false,
  canChangeCard: true,
  canPayAgain: true,
  ...overrides,
});

const group = (overrides: Partial<PaymentIssue> = {}): PaymentIssue => personal({
  organizationId: 'org-1',
  groupName: 'Trail Club',
  planId: 'club',
  planName: 'Tripician Club',
  ...overrides,
});

const anywhere: IssueContext = { checkoutOpen: false, onBillingScreen: false, groupSettingsId: null };

describe('paymentNotice, for the person', () => {
  it('offers a new card first while Razorpay still retries a card subscription', () => {
    expect(paymentNotice(personal(), NOW)).toEqual({
      title: "Your Tripician Pro payment didn't go through",
      body: "We couldn't renew Tripician Pro on 9 Nov 2026. We'll keep trying, but Tripician Pro stops on 13 Nov 2026 unless a payment goes through.",
      primary: { label: 'Update card', action: 'card' },
      secondary: { label: 'Pay another way', action: 'pay' },
      dismiss: 'Not now',
    });
  });

  it('offers paying now, and no card change, when the plan is paid by UPI or a bank mandate', () => {
    const notice = paymentNotice(personal({ canChangeCard: false }), NOW);
    expect(notice.primary).toEqual({ label: 'Pay now', action: 'pay' });
    expect(notice.secondary).toBeUndefined();
    expect(notice.dismiss).toBe('Not now');
  });

  it('gives the bank\'s reason when there is one, without doubling its full stop', () => {
    expect(paymentNotice(personal({ failureReason: 'Card declined by the bank.' }), NOW).body).toBe(
      "We couldn't renew Tripician Pro on 9 Nov 2026. Reason: Card declined by the bank. We'll keep trying, but Tripician Pro stops on 13 Nov 2026 unless a payment goes through.",
    );
  });

  it('says the plan has stopped once retries are over, and offers only paying again', () => {
    expect(paymentNotice(personal({ kind: 'halted', graceEndsAt: undefined }), NOW)).toEqual({
      title: 'Your Tripician Pro has stopped',
      body: "We couldn't take your Tripician Pro renewal payment after several tries, so your account is back on Tripician Basic. Pay again to get Tripician Pro back.",
      primary: { label: 'Pay again', action: 'pay' },
      dismiss: 'Not now',
    });
  });

  it('never offers a card change on a halted plan, which would restart it without the missed payment', () => {
    const notice = paymentNotice(personal({ kind: 'halted', canChangeCard: true }), NOW);
    expect(notice.primary.action).toBe('pay');
    expect(notice.secondary).toBeUndefined();
  });

  it('treats a past-due plan whose grace has run out as stopped, because it has', () => {
    const after = new Date('2026-11-14T06:00:00Z');
    const notice = paymentNotice(personal(), after);
    expect(notice.title).toBe('Your Tripician Pro has stopped');
    expect(notice.primary).toEqual({ label: 'Pay again', action: 'pay' });
  });
});

describe('paymentNotice, for a group', () => {
  it('names the group and keeps the same fixes', () => {
    expect(paymentNotice(group({ failureReason: 'Insufficient funds' }), NOW)).toEqual({
      title: "Trail Club's Tripician Club payment didn't go through",
      body: "We couldn't renew Tripician Club for Trail Club on 9 Nov 2026. Reason: Insufficient funds. We'll keep trying, but Tripician Club stops for the group on 13 Nov 2026 unless a payment goes through.",
      primary: { label: 'Update card', action: 'card' },
      secondary: { label: 'Pay another way', action: 'pay' },
      dismiss: 'Not now',
    });
  });

  it('says the group is back on Basic once retries are over', () => {
    expect(paymentNotice(group({ kind: 'halted' }), NOW)).toEqual({
      title: "Trail Club's Tripician Club has stopped",
      body: "We couldn't take the Tripician Club renewal payment for Trail Club after several tries, so the group is back on Basic. Pay again to get Tripician Club back.",
      primary: { label: 'Pay again', action: 'pay' },
      dismiss: 'Not now',
    });
  });

  it('still reads as a group when the name is missing', () => {
    expect(paymentNotice(group({ groupName: undefined }), NOW).title).toBe("Your group's Tripician Club payment didn't go through");
  });
});

describe('paymentNotice with dates missing', () => {
  it('leaves out the part that needs a date rather than printing Invalid Date', () => {
    const notice = paymentNotice(personal({ paidUntil: undefined, graceEndsAt: undefined }), NOW);
    expect(notice.body).toBe(
      "We couldn't renew Tripician Pro. We'll keep trying, but Tripician Pro stops unless a payment goes through.",
    );
  });

  it('treats a date it cannot read as missing', () => {
    const notice = paymentNotice(group({ paidUntil: 'not a date', graceEndsAt: '' }), NOW);
    expect(notice.body).toBe(
      "We couldn't renew Tripician Club for Trail Club. We'll keep trying, but Tripician Club stops for the group unless a payment goes through.",
    );
    expect(notice.body).not.toContain('Invalid');
  });
});

describe('snoozes', () => {
  it('keys a snooze by who, which failure and which paid period', () => {
    expect(snoozeKey(personal())).toBe(`me|past_due|${PAID_UNTIL}`);
    expect(snoozeKey(group({ kind: 'halted' }))).toBe(`org-1|halted|${PAID_UNTIL}`);
    expect(snoozeKey(personal({ paidUntil: undefined }))).toBe('me|past_due|');
  });

  it('puts an issue off for a day and drops snoozes that have run out', () => {
    const expired = { 'org-9|halted|': NOW.getTime() - 1 };
    const next = snoozeIssue(expired, personal(), NOW);
    expect(next).toEqual({ [`me|past_due|${PAID_UNTIL}`]: NOW.getTime() + SNOOZE_MS });
    expect(SNOOZE_MS).toBe(24 * 60 * 60 * 1000);
  });

  it('reads back only well-formed snoozes from storage', () => {
    expect(asSnoozes({ a: 5, b: 'soon', c: Number.NaN })).toEqual({ a: 5 });
    expect(asSnoozes(null)).toEqual({});
    expect(asSnoozes([1, 2])).toEqual({});
  });
});

describe('pickIssueToShow', () => {
  const issues = [personal(), group()];

  it('shows the first issue, the person\'s own before their groups\'', () => {
    expect(pickIssueToShow(issues, {}, NOW, anywhere)).toBe(issues[0]);
  });

  it('skips a snoozed issue until its snooze runs out', () => {
    const snoozed = snoozeIssue({}, issues[0], NOW);
    expect(pickIssueToShow(issues, snoozed, NOW, anywhere)).toBe(issues[1]);

    const dayLater = new Date(NOW.getTime() + SNOOZE_MS);
    expect(pickIssueToShow(issues, snoozed, dayLater, anywhere)).toBe(issues[0]);
  });

  it('shows the next failure even when the last one was snoozed', () => {
    const snoozed = snoozeIssue({}, issues[0], NOW);
    const nextMonth = personal({ paidUntil: '2026-12-08T18:30:00Z' });
    expect(pickIssueToShow([nextMonth], snoozed, NOW, anywhere)).toBe(nextMonth);
  });

  it('stays away from Billing and Pricing, which show it inline', () => {
    expect(pickIssueToShow(issues, {}, NOW, { ...anywhere, onBillingScreen: true })).toBeNull();
  });

  it('never sits over an open payment sheet', () => {
    expect(pickIssueToShow(issues, {}, NOW, { ...anywhere, checkoutOpen: true })).toBeNull();
  });

  it('leaves a group\'s issue to its own settings tab, and nobody else\'s', () => {
    expect(pickIssueToShow([group()], {}, NOW, { ...anywhere, groupSettingsId: 'org-1' })).toBeNull();
    expect(pickIssueToShow([group()], {}, NOW, { ...anywhere, groupSettingsId: 'org-2' })).toEqual(group());
    // The person's own issue still shows on a group's settings tab.
    expect(pickIssueToShow(issues, {}, NOW, { ...anywhere, groupSettingsId: 'org-1' })).toBe(issues[0]);
  });

  it('shows nothing when there is nothing', () => {
    expect(pickIssueToShow([], {}, NOW, anywhere)).toBeNull();
  });
});

describe('routeIssueContext', () => {
  it('knows Billing and Pricing show issues inline', () => {
    expect(routeIssueContext('/settings', '?tab=billing').onBillingScreen).toBe(true);
    expect(routeIssueContext('/settings', '?tab=Billing').onBillingScreen).toBe(true);
    expect(routeIssueContext('/pricing', '').onBillingScreen).toBe(true);
    expect(routeIssueContext('/settings', '').onBillingScreen).toBe(false);
    expect(routeIssueContext('/settings', '?tab=credits').onBillingScreen).toBe(false);
    expect(routeIssueContext('/', '').onBillingScreen).toBe(false);
  });

  it('knows which group\'s settings tab is open', () => {
    expect(routeIssueContext('/groups/org-1', '?tab=settings')).toEqual({ onBillingScreen: false, groupSettingsId: 'org-1' });
    expect(routeIssueContext('/groups/org-1/', '?tab=settings').groupSettingsId).toBe('org-1');
    expect(routeIssueContext('/groups/org-1', '').groupSettingsId).toBeNull();
    expect(routeIssueContext('/groups/org-1', '?tab=members').groupSettingsId).toBeNull();
  });
});

describe('issueBillingPath', () => {
  it('sends the person to Billing and a group admin to the group\'s settings', () => {
    expect(issueBillingPath(personal())).toBe('/settings?tab=billing');
    expect(issueBillingPath(group())).toBe('/groups/org-1?tab=settings');
  });
});

describe('asPaymentIssues', () => {
  it('keeps well-formed issues only', () => {
    const good = personal();
    expect(asPaymentIssues([good, { kind: 'mystery', planName: 'X' }, { kind: 'halted' }, null])).toEqual([good]);
  });

  it('reads anything that is not a list as no issues', () => {
    expect(asPaymentIssues('<!doctype html>')).toEqual([]);
    expect(asPaymentIssues(undefined)).toEqual([]);
    expect(asPaymentIssues({ issues: [] })).toEqual([]);
  });
});
