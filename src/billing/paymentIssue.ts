import { knownDay } from './billingLabels';
import type { PaymentIssue } from './types';

/*
 * What the failed-payment popup and the inline notice say, and when the popup shows.
 *
 * Pure, so it is tested without a browser. The words are the app's too
 * (tripician_mobile `src/features/billing/paymentIssue.ts`): web and mobile tell
 * somebody about a failed payment in the same words, with the same buttons.
 */

/** The two ways out: a new card on the failing subscription, or a fresh payment by any method. */
export type PaymentFixAction = 'card' | 'pay';

export interface PaymentNoticeAction {
  label: string;
  action: PaymentFixAction;
}

export interface PaymentNotice {
  title: string;
  body: string;
  primary: PaymentNoticeAction;
  secondary?: PaymentNoticeAction;
  /** The popup's way to put it off. The inline notice leaves it out. */
  dismiss: string;
}

/** "Not now" puts the popup off for a day. */
export const SNOOZE_MS = 24 * 60 * 60 * 1000;

/** Which issues the popup is holding back, as issue key to the time (ms) it may show again. */
export type PaymentSnoozes = Record<string, number>;

/** Where somebody is, as far as the popup cares. */
export interface IssueContext {
  /** A Razorpay sheet is open, and nothing may sit over it. */
  checkoutOpen: boolean;
  /** Billing or Pricing, which show the person's issue inline already. */
  onBillingScreen: boolean;
  /** The group whose own settings tab is open: that group's issue is shown inline there. */
  groupSettingsId?: string | null;
}

/** The failure reason as the sentence it goes into needs it: trimmed, and without a full stop of its own. */
function reasonOf(issue: PaymentIssue): string | null {
  const text = issue.failureReason?.trim().replace(/[.\s]+$/, '');
  return text ? text : null;
}

/** A past-due plan whose grace has run out has stopped, even if the halt never reached the server. */
function graceOver(issue: PaymentIssue, now: Date): boolean {
  if (issue.kind !== 'past_due' || issue.graceEndsAt == null) return false;
  const ends = new Date(issue.graceEndsAt).getTime();
  return !Number.isNaN(ends) && ends <= now.getTime();
}

/**
 * The words and the buttons for a renewal payment that failed.
 *
 * Past due: Razorpay is still retrying and the plan stays on until `graceEndsAt`,
 * so a new card or another payment can still save it. Halted: the retries are
 * over, the plan is off, and only paying again brings it back. A date the server
 * did not send is left out of its sentence rather than printed as "Invalid Date".
 */
export function paymentNotice(issue: PaymentIssue, now: Date = new Date()): PaymentNotice {
  const plan = issue.planName;
  const isGroup = issue.organizationId != null;
  const name = issue.groupName?.trim() || null;
  const groupTitle = name ?? 'Your group';
  const groupInline = name ?? 'your group';

  if (issue.kind === 'halted' || graceOver(issue, now)) {
    return {
      title: isGroup ? `${groupTitle}'s ${plan} has stopped` : `Your ${plan} has stopped`,
      body: isGroup
        ? `We couldn't take the ${plan} renewal payment for ${groupInline} after several tries, so the group is back on Basic. Pay again to get ${plan} back.`
        : `We couldn't take your ${plan} renewal payment after several tries, so your account is back on Tripician Basic. Pay again to get ${plan} back.`,
      primary: { label: 'Pay again', action: 'pay' },
      dismiss: 'Not now',
    };
  }

  const paidUntil = knownDay(issue.paidUntil);
  const graceEnds = knownDay(issue.graceEndsAt);
  const reason = reasonOf(issue);
  const on = (day: string | null) => (day ? ` on ${day}` : '');

  const failed = isGroup
    ? `We couldn't renew ${plan} for ${groupInline}${on(paidUntil)}.`
    : `We couldn't renew ${plan}${on(paidUntil)}.`;
  const why = reason ? ` Reason: ${reason}.` : '';
  const stops = isGroup
    ? ` We'll keep trying, but ${plan} stops for the group${on(graceEnds)} unless a payment goes through.`
    : ` We'll keep trying, but ${plan} stops${on(graceEnds)} unless a payment goes through.`;

  return {
    title: isGroup ? `${groupTitle}'s ${plan} payment didn't go through` : `Your ${plan} payment didn't go through`,
    body: `${failed}${why}${stops}`,
    // A card can be swapped only on a card subscription that is still retrying; UPI and bank mandates pay again instead.
    primary: issue.canChangeCard ? { label: 'Update card', action: 'card' } : { label: 'Pay now', action: 'pay' },
    ...(issue.canChangeCard ? { secondary: { label: 'Pay another way', action: 'pay' as const } } : {}),
    dismiss: 'Not now',
  };
}

/**
 * What a snooze is kept under. The paid-until date is part of it, so putting off
 * one failed renewal does not also put off the next one.
 */
export function snoozeKey(issue: PaymentIssue): string {
  return `${issue.organizationId ?? 'me'}|${issue.kind}|${issue.paidUntil ?? ''}`;
}

/** The snoozes with this issue put off for a day, and any that have run out dropped. */
export function snoozeIssue(snoozes: PaymentSnoozes, issue: PaymentIssue, now: Date): PaymentSnoozes {
  const at = now.getTime();
  const kept: PaymentSnoozes = {};
  for (const [key, until] of Object.entries(snoozes)) {
    if (until > at) kept[key] = until;
  }
  kept[snoozeKey(issue)] = at + SNOOZE_MS;
  return kept;
}

/** Snoozes read back from storage, keeping only entries that are a key and a time. */
export function asSnoozes(value: unknown): PaymentSnoozes {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const snoozes: PaymentSnoozes = {};
  for (const [key, until] of Object.entries(value as Record<string, unknown>)) {
    if (typeof until === 'number' && Number.isFinite(until)) snoozes[key] = until;
  }
  return snoozes;
}

/**
 * The issue the popup should show now, or null.
 *
 * The first one that is not snoozed and not already on screen: Billing and
 * Pricing show the person's issue inline, a group's settings tab shows that
 * group's, and nothing may sit over an open payment sheet.
 */
export function pickIssueToShow(
  issues: readonly PaymentIssue[],
  snoozes: PaymentSnoozes,
  now: Date,
  context: IssueContext,
): PaymentIssue | null {
  if (context.checkoutOpen || context.onBillingScreen) return null;
  const at = now.getTime();
  for (const issue of issues) {
    const until = snoozes[snoozeKey(issue)];
    if (until != null && until > at) continue;
    if (issue.organizationId != null && issue.organizationId === context.groupSettingsId) continue;
    return issue;
  }
  return null;
}

/** Only well-formed issues: an answer in some other shape shows nothing rather than nonsense. */
export function asPaymentIssues(data: unknown): PaymentIssue[] {
  if (!Array.isArray(data)) return [];
  return data.filter((item): item is PaymentIssue => {
    const issue = item as Partial<PaymentIssue> | null;
    return !!issue
      && typeof issue === 'object'
      && (issue.kind === 'past_due' || issue.kind === 'halted')
      && typeof issue.planName === 'string'
      && issue.planName.trim() !== '';
  });
}

/** Where an issue is managed on the web: Billing for the person's own plan, the group's settings tab for a group's. */
export function issueBillingPath(issue: PaymentIssue): string {
  return issue.organizationId != null
    ? `/groups/${encodeURIComponent(issue.organizationId)}?tab=settings`
    : '/settings?tab=billing';
}

/** The popup's view of a web route: which screens already show issues inline. */
export function routeIssueContext(pathname: string, search: string): Omit<IssueContext, 'checkoutOpen'> {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const tab = (new URLSearchParams(search).get('tab') ?? '').toLowerCase();
  const group = /^\/groups\/([^/]+)$/.exec(path);
  let groupSettingsId: string | null = null;
  if (group && tab === 'settings') {
    try { groupSettingsId = decodeURIComponent(group[1]); } catch { groupSettingsId = group[1]; }
  }
  return {
    onBillingScreen: path === '/pricing' || (path === '/settings' && tab === 'billing'),
    groupSettingsId,
  };
}
