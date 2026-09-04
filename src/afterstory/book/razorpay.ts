import { BRAND } from '../../theme';
import type { PaymentIntent, RazorpayResult } from './types';

/**
 * Razorpay's checkout script, loaded when somebody actually wants to pay.
 *
 * Deliberately not in index.html. A payment provider's script on every page load
 * is a third party watching every page load, and it is dead weight for the many
 * readers who never buy anything.
 */
const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

let loading: Promise<boolean> | null = null;

export const loadRazorpay = (): Promise<boolean> => {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if ((window as unknown as { Razorpay?: unknown }).Razorpay) return Promise.resolve(true);

  // Cached, so opening the dialog twice does not add a second script tag.
  loading ??= new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => { loading = null; resolve(false); };
    document.body.appendChild(script);
  });

  return loading;
};

interface OpenOptions {
  intent: PaymentIntent;
  storyTitle: string;
  onPaid: (result: RazorpayResult) => void;
  /** They closed the sheet. Not an error: the order is still there to pay later. */
  onDismissed: () => void;
  onFailed: (message: string) => void;
}

/**
 * Opens the payment sheet.
 *
 * Every outcome is handled. A sheet that reports only success leaves somebody
 * staring at a spinner after a declined card, which is the moment they decide
 * the product is broken.
 */
export const openRazorpayCheckout = ({
  intent, storyTitle, onPaid, onDismissed, onFailed,
}: OpenOptions): void => {
  const Razorpay = (window as unknown as { Razorpay?: new (options: unknown) => {
    open: () => void;
    on: (event: string, handler: (response: unknown) => void) => void;
  } }).Razorpay;

  if (!Razorpay) {
    onFailed('The payment window could not be opened. Please try again.');
    return;
  }

  const checkout = new Razorpay({
    key: intent.keyId,
    // Both come from the server. Razorpay checks the amount against the order it
    // already holds, so a tampered value here fails rather than underpays.
    amount: intent.amountPaise,
    currency: intent.currency,
    order_id: intent.razorpayOrderId,
    name: 'Tripician',
    description: `Story Book: ${storyTitle}`,
    prefill: {
      name: intent.customerName ?? undefined,
      email: intent.customerEmail ?? undefined,
      contact: intent.customerPhone ?? undefined,
    },
    // The payment sheet is Razorpay's, but it should still look like Tripician.
    theme: { color: BRAND.coral },
    handler: (response: unknown) => onPaid(response as RazorpayResult),
    modal: { ondismiss: () => onDismissed() },
  });

  checkout.on('payment.failed', (response: unknown) => {
    const error = (response as { error?: { description?: string; reason?: string } })?.error;
    onFailed(error?.description ?? 'That payment did not go through. Please try again.');
  });

  checkout.open();
};

interface SubscriptionOptions {
  keyId: string;
  subscriptionId: string;
  description: string;
  onPaid: () => void;
  onDismissed: () => void;
  onFailed: (message: string) => void;
}

/**
 * The recurring payment sheet.
 *
 * Razorpay takes a subscription_id here rather than an order_id, and the mandate
 * it sets up is what charges every renewal. There is no signature to verify
 * afterwards: the subscription only becomes real when Razorpay tells the server
 * so over the webhook, which is why success here promises nothing more than
 * "the sheet closed happily".
 */
export const openRazorpaySubscription = ({
  keyId, subscriptionId, description, onPaid, onDismissed, onFailed,
}: SubscriptionOptions): void => {
  const Razorpay = (window as unknown as { Razorpay?: new (options: unknown) => {
    open: () => void;
    on: (event: string, handler: (response: unknown) => void) => void;
  } }).Razorpay;

  if (!Razorpay) {
    onFailed('The payment window could not be opened. Please try again.');
    return;
  }

  const checkout = new Razorpay({
    key: keyId,
    subscription_id: subscriptionId,
    name: 'Tripician',
    description,
    theme: { color: BRAND.coral },
    handler: () => onPaid(),
    modal: { ondismiss: () => onDismissed() },
  });

  checkout.on('payment.failed', (response: unknown) => {
    const error = (response as { error?: { description?: string } })?.error;
    onFailed(error?.description ?? 'That payment did not go through. Please try again.');
  });

  checkout.open();
};
