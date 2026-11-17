import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/APIs/apiServices', () => ({
  apiServices: { getPaymentIssues: vi.fn() },
}));

import { apiServices } from '../services/APIs/apiServices';
import { markAnonymous, setAccessToken } from '../services/auth/sessionStatus';
import {
  BILLING_CHANGED_EVENT,
  clearPaymentIssues,
  currentPaymentIssues,
  notifyBillingChanged,
  refreshPaymentIssues,
} from './billingStatus';
import type { PaymentIssue } from './types';

const getPaymentIssues = vi.mocked(apiServices.getPaymentIssues);

/** An unsigned token with a subject and an hour to live: enough for the session store to call it valid. */
function tokenFor(sub: string): string {
  const part = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/[+]/g, '-').replace(/[/]/g, '_');
  return `${part({ alg: 'none', typ: 'JWT' })}.${part({ sub, exp: Math.floor(Date.now() / 1000) + 3600 })}.x`;
}

const answer = (data: unknown) => ({ data }) as Awaited<ReturnType<typeof apiServices.getPaymentIssues>>;

const issue: PaymentIssue = {
  planId: 'pro',
  planName: 'Tripician Pro',
  kind: 'past_due',
  paidUntil: '2026-11-08T18:30:00Z',
  graceEndsAt: '2026-11-12T18:30:00Z',
  amount: 199,
  currency: 'INR',
  annual: false,
  canChangeCard: true,
  canPayAgain: true,
};

beforeEach(() => {
  getPaymentIssues.mockReset();
  setAccessToken(tokenFor('auth0|asha'));
  clearPaymentIssues();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the failed-payment list', () => {
  it('holds what the server sends', async () => {
    getPaymentIssues.mockResolvedValue(answer([issue]));
    await refreshPaymentIssues();
    expect(currentPaymentIssues()).toEqual([issue]);
  });

  it('stays empty and quiet against a server without the endpoint', async () => {
    getPaymentIssues.mockRejectedValue(Object.assign(new Error('Request failed with status code 404'), { response: { status: 404 } }));
    await expect(refreshPaymentIssues()).resolves.toBeUndefined();
    expect(currentPaymentIssues()).toEqual([]);
  });

  it('empties when a later read fails, rather than keeping a warning it cannot confirm', async () => {
    getPaymentIssues.mockResolvedValueOnce(answer([issue]));
    await refreshPaymentIssues();
    getPaymentIssues.mockRejectedValueOnce(new Error('offline'));
    await refreshPaymentIssues({ force: true });
    expect(currentPaymentIssues()).toEqual([]);
  });

  it('ignores an answer in some other shape', async () => {
    getPaymentIssues.mockResolvedValue(answer('<!doctype html>'));
    await refreshPaymentIssues();
    expect(currentPaymentIssues()).toEqual([]);
  });

  it('forgets the list the moment the person signs out', async () => {
    getPaymentIssues.mockResolvedValue(answer([issue]));
    await refreshPaymentIssues();
    markAnonymous();
    expect(currentPaymentIssues()).toEqual([]);
  });

  it('never shows one account\'s list to another', async () => {
    getPaymentIssues.mockResolvedValueOnce(answer([issue]));
    await refreshPaymentIssues();

    let answerLater: (value: unknown) => void = () => undefined;
    getPaymentIssues.mockImplementationOnce(() => new Promise((resolve) => { answerLater = resolve; }) as never);
    setAccessToken(tokenFor('auth0|ravi'));
    const reading = refreshPaymentIssues();
    expect(currentPaymentIssues()).toEqual([]);
    answerLater(answer([]));
    await reading;
    expect(currentPaymentIssues()).toEqual([]);
  });

  it('shares one read between callers unless one is forced', async () => {
    getPaymentIssues.mockResolvedValue(answer([]));
    await Promise.all([refreshPaymentIssues(), refreshPaymentIssues()]);
    expect(getPaymentIssues).toHaveBeenCalledTimes(1);
  });

  it('lets the newest read win when two overlap', async () => {
    let answerFirst: (value: unknown) => void = () => undefined;
    getPaymentIssues
      .mockImplementationOnce(() => new Promise((resolve) => { answerFirst = resolve; }) as never)
      .mockResolvedValueOnce(answer([]));
    const first = refreshPaymentIssues();
    const second = refreshPaymentIssues({ force: true });
    await second;
    // The older answer still names the failure, but it was asked before the payment.
    answerFirst(answer([issue]));
    await first;
    expect(currentPaymentIssues()).toEqual([]);
  });
});

describe('notifyBillingChanged', () => {
  it('reads the list again and tells every plan display to read its own', () => {
    const target = new EventTarget();
    vi.stubGlobal('window', target);
    const heard = vi.fn();
    target.addEventListener(BILLING_CHANGED_EVENT, heard);
    getPaymentIssues.mockResolvedValue(answer([]));

    notifyBillingChanged();

    expect(heard).toHaveBeenCalledTimes(1);
    expect(getPaymentIssues).toHaveBeenCalledTimes(1);
    expect(BILLING_CHANGED_EVENT).toBe('billing:changed');
  });
});
