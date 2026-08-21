export type PlanId = 'basic' | 'pro' | 'business';

export type StoryBookPriceTier = 'retail' | 'pro_member' | 'business_member';

export interface Plan {
  planId: PlanId;
  name: string;
  /** "user" or "organization". Business is never a personal plan. */
  scope: 'user' | 'organization';
  monthlyPrice: number;
  annualPrice: number;
  /**
   * No limit. Business is configured that way on purpose.
   *
   * Optional as well as nullable: the API omits null properties entirely, so an
   * unlimited plan arrives with the field absent rather than set to null.
   */
  maxTripMembers?: number | null;
  maxRecruitedTravellers?: number | null;
  naviaMonthlyCredits: number;
  storyBookPriceTier: StoryBookPriceTier;
}

export interface PlanList {
  currency: string;
  plans: Plan[];
}

export interface StoryBookProduct {
  pageCount: number;
  retail: number;
  pro: number;
  business: number;
  /** False until a real printer product is configured for that size. */
  orderable: boolean;
}

export interface PublicSale {
  percent: number;
  label: string | null;
  endsAt: string | null;
}

export interface StoryBookPriceList {
  currency: string;
  products: StoryBookProduct[];
  /** A sale running now, or null. Applies on top of whatever tier you are on. */
  sale: PublicSale | null;
}

/**
 * A price with its working shown. Every field here exists because the checkout
 * is required to explain itself rather than present one number.
 */
export interface StoryBookQuote {
  available: boolean;
  unavailable: string | null;
  naturalPageCount: number;
  billedPageCount: number;
  blankPagesAdded: number;
  nextBandDownPages: number | null;
  nextBandDownPrice: number | null;
  priceTier: StoryBookPriceTier | '';
  unitPrice: number;
  retailUnitPrice: number;
  memberSavingPerCopy: number;
  quantity: number;
  bulkDiscountPercent: number;
  discount: number;
  subtotal: number;
  /** Applied after the tier price and any bulk band, never off retail.
   *  Delivery is added after this and no code discounts it. */
  promoCode: string | null;
  promoPercent: number;
  /** The sale, when it beat the code or no code was given. */
  salePercent: number;
  saleLabel: string | null;
  /** Whichever of the two actually applied. Never their sum. */
  discountPercent: number;
  promoDiscount: number;
  /** Why a typed code was refused. Null when none was typed. */
  promoRefusal: string | null;
  /** Quoted from the printer for the real destination. Never assumed. */
  shipping: number;
  /** Which carrier that price was for, e.g. "blue_dart". */
  shippingMethod: string | null;
  minDeliveryDays: number | null;
  maxDeliveryDays: number | null;
  tax: number;
  total: number;
  currency: string;
}

/** Indian formatting, because every price in the system is quoted in rupees. */
export const formatMoney = (amount: number, currency = 'INR'): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);

/** Absent and null both mean "no limit here", and the API sends absent. */
export const isUnlimited = (limit: number | null | undefined): boolean =>
  limit === null || limit === undefined;

export type PlanStatus =
  | 'none' | 'pending' | 'active' | 'past_due' | 'halted' | 'cancelled' | 'completed';

/** Where somebody stands with their subscription. */
export interface SubscriptionState {
  planId: PlanId;
  status: PlanStatus;
  renewsAt: string | null;
  annual: boolean;
  canCancel: boolean;
}

/** What the browser needs to open the recurring payment sheet. */
export interface SubscriptionIntent {
  ok: boolean;
  error: string | null;
  keyId: string;
  subscriptionId: string;
  planId: PlanId;
  annual: boolean;
  amount: number;
  currency: string;
  description: string | null;
  /** A code takes its percentage off the first charge only; renewals are full price. */
  firstChargeDiscountPercent: number | null;
  promoCode: string | null;
}
