import { BRAND } from '../theme';
import { checkoutIdentity, checkoutLogo, type Payer } from './checkoutIdentity';
import type { CheckoutIntent, RazorpayResult } from './types';

// Without an image Razorpay prints the first letter of the name in a tile, which is the "T" people took for a made-up logo.
const LOGO = checkoutLogo(import.meta.env.VITE_TRIPICIAN_LOGO as string | undefined);

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

/*
 * Whether a payment sheet is open right now.
 *
 * Razorpay draws its sheet in an iframe over the page, and an MUI dialog under it
 * keeps pulling focus back into itself, so the card form cannot be typed into.
 * Anything that would pop up (the failed-payment prompt) waits until no sheet is open.
 */
let sheetsOpen = 0;
const sheetListeners = new Set<() => void>();

function countSheets(change: 1 | -1): void {
  sheetsOpen = Math.max(0, sheetsOpen + change);
  for (const listener of sheetListeners) {
    try { listener(); } catch { /* one broken listener must not stop the rest */ }
  }
}

export const isCheckoutOpen = (): boolean => sheetsOpen > 0;

/** Told whenever a sheet opens or closes. Returns the unsubscribe, so it fits `useSyncExternalStore`. */
export const subscribeCheckout = (listener: () => void): (() => void) => {
  sheetListeners.add(listener);
  return () => { sheetListeners.delete(listener); };
};

/** One sheet's open and close, each counted once however Razorpay reports the close. */
function sheetTracker() {
  let open = false;
  return {
    opened: () => { if (!open) { open = true; countSheets(1); } },
    closed: () => { if (open) { open = false; countSheets(-1); } },
  };
}

/** Opens the sheet, and never leaves it counted as open if Razorpay throws instead. */
function openTracked(checkout: { open: () => void }, sheet: ReturnType<typeof sheetTracker>): void {
  sheet.opened();
  try {
    checkout.open();
  } catch (err) {
    sheet.closed();
    throw err;
  }
}

interface OpenOptions {
  intent: CheckoutIntent;
  /** What the sheet says is being bought. */
  description: string;
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
  intent, description, onPaid, onDismissed, onFailed,
}: OpenOptions): void => {
  const Razorpay = (window as unknown as { Razorpay?: new (options: unknown) => {
    open: () => void;
    on: (event: string, handler: (response: unknown) => void) => void;
  } }).Razorpay;

  if (!Razorpay) {
    onFailed('The payment window could not be opened. Please try again.');
    return;
  }

  const sheet = sheetTracker();
  const checkout = new Razorpay({
    key: intent.keyId,
    // Both come from the server. Razorpay checks the amount against the order it
    // already holds, so a tampered value here fails rather than underpays.
    amount: intent.amountPaise,
    currency: intent.currency,
    order_id: intent.razorpayOrderId,
    name: 'Tripician',
    image: LOGO,
    description,
    ...checkoutIdentity({ name: intent.customerName, email: intent.customerEmail, phone: intent.customerPhone }),
    // The payment sheet is Razorpay's, but it should still look like Tripician.
    theme: { color: BRAND.coral },
    handler: (response: unknown) => { sheet.closed(); onPaid(response as RazorpayResult); },
    modal: { ondismiss: () => { sheet.closed(); onDismissed(); } },
  });

  checkout.on('payment.failed', (response: unknown) => {
    const error = (response as { error?: { description?: string; reason?: string } })?.error;
    onFailed(error?.description ?? 'That payment did not go through. Please try again.');
  });

  openTracked(checkout, sheet);
};

interface SubscriptionOptions {
  keyId: string;
  subscriptionId: string;
  description: string;
  /** The signed-in buyer. Without it the sheet shows whoever Razorpay remembers on this device. */
  payer: Payer;
  /**
   * Opens an existing subscription to take a new card instead of starting one.
   * Razorpay charges the overdue renewal to that card while it is still retrying.
   */
  cardChange?: boolean;
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
  keyId, subscriptionId, description, payer, cardChange = false, onPaid, onDismissed, onFailed,
}: SubscriptionOptions): void => {
  const Razorpay = (window as unknown as { Razorpay?: new (options: unknown) => {
    open: () => void;
    on: (event: string, handler: (response: unknown) => void) => void;
  } }).Razorpay;

  if (!Razorpay) {
    onFailed('The payment window could not be opened. Please try again.');
    return;
  }

  const sheet = sheetTracker();
  const checkout = new Razorpay({
    key: keyId,
    subscription_id: subscriptionId,
    ...(cardChange ? { subscription_card_change: 1 } : {}),
    name: 'Tripician',
    image: LOGO,
    description,
    ...checkoutIdentity(payer),
    theme: { color: BRAND.coral },
    handler: () => { sheet.closed(); onPaid(); },
    modal: { ondismiss: () => { sheet.closed(); onDismissed(); } },
  });

  checkout.on('payment.failed', (response: unknown) => {
    const error = (response as { error?: { description?: string } })?.error;
    onFailed(error?.description ?? 'That payment did not go through. Please try again.');
  });

  openTracked(checkout, sheet);
};
