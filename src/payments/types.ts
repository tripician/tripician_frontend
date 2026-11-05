/**
 * The parts of a server-made payment intent the Razorpay sheet needs (credit
 * packs today). Note what is missing: nothing here was sent BY the browser to get
 * it. The amount is the figure the server priced, travelling outward.
 */
export interface CheckoutIntent {
  keyId: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone?: string | null;
}

/** What Razorpay hands back on success, passed straight to the server to check. */
export interface RazorpayResult {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}
