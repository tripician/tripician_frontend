import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isCheckoutOpen, openRazorpaySubscription, subscribeCheckout } from './razorpay';

type Options = Record<string, unknown> & {
  handler: () => void;
  modal: { ondismiss: () => void };
};

/** Stands in for Razorpay's checkout: keeps the options it was opened with, and can be told to fail on open. */
class FakeRazorpay {
  static last: FakeRazorpay | null = null;
  static all: FakeRazorpay[] = [];
  static failOnOpen = false;
  options: Options;
  opened = false;

  constructor(options: Options) {
    this.options = options;
    FakeRazorpay.last = this;
    FakeRazorpay.all.push(this);
  }

  on(): void { /* payment.failed is not exercised here */ }

  open(): void {
    if (FakeRazorpay.failOnOpen) throw new Error('blocked');
    this.opened = true;
  }
}

const open = (extra: { cardChange?: boolean } = {}) => {
  const outcome = { paid: 0, dismissed: 0, failed: [] as string[] };
  openRazorpaySubscription({
    keyId: 'rzp_test_key',
    subscriptionId: 'sub_TEST123',
    description: 'Tripician Pro',
    payer: { name: 'Asha Rao', email: 'asha@example.com', phone: null },
    ...extra,
    onPaid: () => { outcome.paid += 1; },
    onDismissed: () => { outcome.dismissed += 1; },
    onFailed: (message) => { outcome.failed.push(message); },
  });
  return { checkout: FakeRazorpay.last!, outcome };
};

beforeEach(() => {
  FakeRazorpay.last = null;
  FakeRazorpay.all = [];
  FakeRazorpay.failOnOpen = false;
  vi.stubGlobal('window', { Razorpay: FakeRazorpay });
});

afterEach(() => {
  // Close whatever a test left open, so the count starts at zero for the next.
  for (const checkout of FakeRazorpay.all) checkout.options.modal.ondismiss();
  vi.unstubAllGlobals();
});

describe('openRazorpaySubscription', () => {
  it('opens the existing subscription for a card change when asked', () => {
    const { checkout } = open({ cardChange: true });
    expect(checkout.opened).toBe(true);
    expect(checkout.options.subscription_id).toBe('sub_TEST123');
    expect(checkout.options.subscription_card_change).toBe(1);
  });

  it('starts or pays a subscription without the card-change flag otherwise', () => {
    expect(open().checkout.options).not.toHaveProperty('subscription_card_change');
    expect(open({ cardChange: false }).checkout.options).not.toHaveProperty('subscription_card_change');
  });
});

describe('isCheckoutOpen', () => {
  it('is true while a sheet is open, and false once it is paid or closed', () => {
    const changes = vi.fn();
    const unsubscribe = subscribeCheckout(changes);
    expect(isCheckoutOpen()).toBe(false);

    const paid = open();
    expect(isCheckoutOpen()).toBe(true);
    paid.checkout.options.handler();
    expect(isCheckoutOpen()).toBe(false);
    expect(paid.outcome.paid).toBe(1);

    const closed = open();
    expect(isCheckoutOpen()).toBe(true);
    closed.checkout.options.modal.ondismiss();
    // A second close report must not count twice.
    closed.checkout.options.modal.ondismiss();
    expect(isCheckoutOpen()).toBe(false);
    expect(closed.outcome.dismissed).toBe(2);

    expect(changes).toHaveBeenCalledTimes(4);
    unsubscribe();
  });

  it('does not count a sheet that failed to open', () => {
    FakeRazorpay.failOnOpen = true;
    expect(() => open()).toThrow('blocked');
    expect(isCheckoutOpen()).toBe(false);
  });
});
