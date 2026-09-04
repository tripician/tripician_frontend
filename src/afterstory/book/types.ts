export type BookOrderStatus =
  | 'preview_pending'
  | 'preview_approved'
  | 'awaiting_payment'
  | 'paid'
  /** Ours to make. Paid and waiting on a person, not a press. */
  | 'awaiting_fulfilment'
  | 'in_production'
  | 'shipped'
  | 'cancelled'
  | 'failed';

export interface DeliveryAddress {
  email: string;
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  zipCode: string;
  city: string;
  state?: string;
  /** Both forms, because the print providers disagree about which they want. */
  countryAlpha2: string;
  countryAlpha3: string;
  phone?: string;
}

export interface CreateBookOrderRequest extends DeliveryAddress {
  storyId: string;
  quantity: number;
  promoCode?: string;
}

export interface BookOrder {
  id: string;
  storyId: string;
  status: BookOrderStatus;
  quantity: number;
  pageCount: number;
  total: number;
  currency: string;
  promoCode?: string | null;
  paymentReference?: string | null;
  /** Set once it is with a courier. Both arrive together or not at all. */
  courier?: string | null;
  trackingNumber?: string | null;
}

/**
 * What the payment sheet needs.
 *
 * The amount is here so the sheet can show it, but note that nothing sent it
 * outward: the server read it from the stored order. There is no amount field
 * anywhere on the way in, which is what makes tampering impossible rather than
 * merely discouraged.
 */
export interface PaymentIntent {
  ok: boolean;
  error: string | null;
  keyId: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  bookOrderId: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
}

/** What Razorpay hands back on success, passed straight to the server to check. */
export interface RazorpayResult {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}
