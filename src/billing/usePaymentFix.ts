import React from 'react';
import { useAuthToken } from '../hooks/useAuth0Token';
import { apiServices } from '../services/APIs/apiServices';
import { loadRazorpay, openRazorpaySubscription } from '../payments/razorpay';
import { waitForPlan } from '../pricing/planActivation';
import { serverMessage } from '../utils/apiError';
import { notifyBillingChanged } from './billingStatus';
import type { PaymentFixAction } from './paymentIssue';
import type { PaymentIssue } from './types';

export interface PaymentFix {
  /** What is running: opening the sheet for one of the fixes, or waiting for the plan to turn back on. */
  busy: PaymentFixAction | 'settling' | null;
  /** A refusal from the server, or what the sheet said went wrong. The fixes stay on offer. */
  error: string | null;
  /** How the payment is going, once there is something to say. */
  message: string | null;
  /** Money went through here, so neither fix is offered again, whatever the list still says. */
  paid: boolean;
  run: (action: PaymentFixAction, issue: PaymentIssue) => Promise<void>;
  /** Forgets this attempt. A payment already on its way still settles, but says nothing here. */
  reset: () => void;
}

const COULD_NOT_OPEN = 'That payment could not be opened. Please try again.';

/**
 * Pays for a failed renewal, from the popup or the inline notice.
 *
 * `card` opens the failing subscription with a card change: Razorpay charges
 * the overdue renewal to the new card. `pay` opens a fresh subscription for the
 * same plan and period, by any method, which takes over from the failing one
 * once it is paid. Either way nothing is granted by the sheet: the plan comes
 * back when Razorpay tells the server, so this waits for the subscription to read
 * active again, then tells everything else showing the plan to read it again.
 */
export function usePaymentFix(): PaymentFix {
  const { token } = useAuthToken();
  const [busy, setBusy] = React.useState<PaymentFix['busy']>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [paid, setPaid] = React.useState(false);

  // Bumped by every attempt and every reset: an older attempt's outcome is not this one's to say.
  const attempt = React.useRef(0);
  // A payment settles after the sheet closes, so nothing is written once the screen is gone.
  const mounted = React.useRef(true);
  React.useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const current = (mine: number) => mounted.current && attempt.current === mine;

  const settle = async (mine: number, bearer: string, issue: PaymentIssue) => {
    const plan = issue.planName;
    if (current(mine)) {
      setBusy('settling');
      setError(null);
      setPaid(true);
      setMessage(`Payment received. Turning ${plan} back on…`);
    }

    const active = await waitForPlan({
      read: async () => (await apiServices.getMySubscription(bearer, issue.organizationId ?? undefined)).data?.status,
      wanted: 'active',
    });

    // Whatever became of this screen, every other one showing the plan reads it again.
    notifyBillingChanged();
    if (!current(mine)) return;
    setBusy(null);
    setMessage(active
      ? `You're all set. ${plan} is back on.`
      : `Payment received. ${plan} turns back on as soon as Razorpay confirms it.`);
  };

  const run = async (action: PaymentFixAction, issue: PaymentIssue) => {
    if (!token || busy !== null) return;
    const mine = ++attempt.current;
    setBusy(action);
    setError(null);
    setMessage(null);

    try {
      if (!(await loadRazorpay())) {
        if (current(mine)) setError('The payment window could not load. Check your connection and try again.');
        return;
      }

      const organizationId = issue.organizationId ?? undefined;
      const { data } = action === 'card'
        ? await apiServices.changeSubscriptionCard(token, organizationId)
        : await apiServices.retrySubscription(token, organizationId);
      // Put off or closed while the server answered: no sheet nobody asked for.
      if (!current(mine)) return;
      // A refusal is a 400 and lands in the catch; this is for a 2xx that still says no.
      if (!data?.ok || !data.subscriptionId) {
        setError(data?.error ?? COULD_NOT_OPEN);
        return;
      }

      // Once a payment has gone through, nothing the sheet says afterwards may overwrite that.
      let done = false;
      openRazorpaySubscription({
        keyId: data.keyId,
        subscriptionId: data.subscriptionId,
        description: data.description ?? issue.planName,
        payer: { name: data.customerName, email: data.customerEmail, phone: data.customerPhone },
        cardChange: action === 'card',
        onPaid: () => { done = true; void settle(mine, token, issue); },
        onDismissed: () => {
          if (!done && current(mine)) setMessage((said) => said ?? 'No payment was taken.');
        },
        onFailed: (text) => { if (!done && current(mine)) setError(text); },
      });
    } catch (err) {
      // A 404 from a server without these endpoints lands here too, as the plain line.
      if (current(mine)) setError(serverMessage(err) ?? COULD_NOT_OPEN);
    } finally {
      if (current(mine)) setBusy((now) => (now === 'settling' ? now : null));
    }
  };

  const reset = () => {
    attempt.current += 1;
    setBusy(null);
    setError(null);
    setMessage(null);
    setPaid(false);
  };

  return { busy, error, message, paid, run, reset };
}
