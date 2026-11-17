import React from 'react';
import { apiServices } from '../services/APIs/apiServices';
import { getSnapshot as getSession, subscribe as subscribeSession } from '../services/auth/sessionStatus';
import { tokenSubject } from '../utils/authSession';
import { asPaymentIssues } from './paymentIssue';
import type { PaymentIssue } from './types';

/*
 * Renewal payments that failed, for the signed-in person and the groups they run.
 *
 * One list for the whole app, the way useBusinessComingSoon shares one answer:
 * the popup, Billing, Pricing and a group's plan panel all read it, so paying in
 * one place clears the warning in every other.
 *
 * Any failure, a 404 from a server that predates the endpoint included, leaves
 * the list empty and says nothing. Not knowing is not a failed payment.
 */

/** Fired after any payment, card change or cancel, so every plan display reads its own data again. */
export const BILLING_CHANGED_EVENT = 'billing:changed';

/** Coming back to the tab reads again, but at most this often. */
export const VISIBLE_REFRESH_MS = 5 * 60 * 1000;

const NONE: PaymentIssue[] = [];

let issues: PaymentIssue[] = NONE;
/** Whose list it is, so one account's problems never show in another account's session. */
let owner: string | null = null;
let loadedAt = 0;
/** Bumped by every read and by every clear, so only the newest answer lands. */
let generation = 0;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(next: PaymentIssue[]): void {
  issues = next.length > 0 ? next : NONE;
  for (const listener of listeners) {
    try { listener(); } catch { /* one broken reader must not stop the rest */ }
  }
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

/** The list as it stands, for code outside React. Components use `usePaymentIssues`. */
export const currentPaymentIssues = (): PaymentIssue[] => issues;

/** Forgets the list. Signing out does this, and so does a different account signing in. */
export function clearPaymentIssues(): void {
  owner = null;
  loadedAt = 0;
  generation += 1;
  inFlight = null;
  if (issues !== NONE) publish(NONE);
}

/**
 * Reads the list again. One read at a time unless `force`, which a payment uses:
 * a read that started before the money moved would answer with the old problem.
 */
export function refreshPaymentIssues({ force = false }: { force?: boolean } = {}): Promise<void> {
  const token = getSession().token;
  const subject = tokenSubject(token);
  if (!token || !subject) {
    clearPaymentIssues();
    return Promise.resolve();
  }
  if (subject !== owner) {
    clearPaymentIssues();
    owner = subject;
  }
  if (inFlight && !force) return inFlight;

  const ticket = ++generation;
  const request: Promise<void> = apiServices.getPaymentIssues(token)
    .then((resp) => asPaymentIssues(resp.data))
    .catch(() => NONE)
    .then((next) => {
      // Overtaken by a newer read, or signed out meanwhile.
      if (ticket !== generation || owner !== subject) return;
      loadedAt = Date.now();
      publish(next);
    })
    .finally(() => {
      if (inFlight === request) inFlight = null;
    });
  inFlight = request;
  return request;
}

/** Reads again unless this account's list was read in the last few minutes. */
export function refreshPaymentIssuesIfStale(): Promise<void> {
  const fresh = loadedAt > 0
    && owner === tokenSubject(getSession().token)
    && Date.now() - loadedAt < VISIBLE_REFRESH_MS;
  return fresh ? Promise.resolve() : refreshPaymentIssues();
}

/**
 * A payment, card change or cancel just went through: read the list again, and
 * tell ProPill, Billing and the group panel to read their own data again too.
 */
export function notifyBillingChanged(): void {
  void refreshPaymentIssues({ force: true });
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new Event(BILLING_CHANGED_EVENT));
  } catch { /* nothing to tell */ }
}

/** The failed payments to tell the signed-in person about: theirs first, then their groups'. Empty until known. */
export function usePaymentIssues(): PaymentIssue[] {
  return React.useSyncExternalStore(subscribe, currentPaymentIssues, currentPaymentIssues);
}

/**
 * Keeps the list current while somebody is signed in: read at sign-in and at app
 * start, and again when the tab comes back into view, at most every five minutes.
 *
 * A token refresh unmounts the signed-in tree for a moment, so remounting for the
 * same account reads again only if the list is stale.
 */
export function usePaymentIssueSync(subject: string | null): void {
  React.useEffect(() => {
    if (!subject) return;
    if (owner === subject && loadedAt > 0) void refreshPaymentIssuesIfStale();
    else void refreshPaymentIssues({ force: true });

    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshPaymentIssuesIfStale();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [subject]);
}

/**
 * A number that changes whenever the plan may have changed: a payment, card
 * change or cancel anywhere in the app, or the tab coming back after a while.
 * Put it in an effect's dependencies and that effect reads the plan again.
 */
export function useBillingRefresh(): number {
  const [key, setKey] = React.useState(0);
  React.useEffect(() => {
    let readAt = Date.now();
    const bump = () => {
      readAt = Date.now();
      setKey((current) => current + 1);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - readAt >= VISIBLE_REFRESH_MS) bump();
    };
    window.addEventListener(BILLING_CHANGED_EVENT, bump);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener(BILLING_CHANGED_EVENT, bump);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return key;
}

// Signing out, or another account signing in, forgets the list there and then,
// so a public page such as Pricing never shows the last account's problem.
subscribeSession(() => {
  if (owner === null) return;
  const session = getSession();
  const subject = session.status === 'anonymous' ? null : tokenSubject(session.token);
  if (subject !== owner) clearPaymentIssues();
});
