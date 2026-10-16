/** API guide §5b. */
export interface QuoteRequest {
  lines: { bookId: number; quantity: number }[];
  countryCode: string | null;
  savedAddressId: number | null;
  couponCode: string | null;
  shippingMethod: string | null;
  giftWrap: boolean;
  readingPathId: number | null;
}

export interface QuoteLine {
  bookId: number;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  coverThumbnailUrl?: string | null;
  unitPrice: number;
  oldPrice: number | null;
  quantity: number;
  lineTotal: number;
  /** false → Checkout.InsufficientStock for this line. */
  available: boolean;
}

export interface ShippingOption {
  code: string;
  /** null for "standard": label it «الشحن العادي». */
  name: string | null;
  carrier: string | null;
  price: number;
  isFree: boolean;
  minDays: number;
  maxDays: number;
  isPickup: boolean;
  isRecommended: boolean;
}

export interface PathDiscount {
  readingPathId: number;
  title: string;
  discountPercentage: number;
  amount: number;
  applied: boolean;
  missingBookIds: number[];
}

export interface QuoteProblem {
  code: string;
  bookId: number | null;
}

export interface Quote {
  currency: string;
  lines: QuoteLine[];
  subtotal: number;
  coupon: { code: string; discountPercentage: number } | null;
  /** Coupon part only. */
  discountAmount: number;
  pathDiscountAmount: number;
  pathDiscount: PathDiscount | null;
  shippingOptions: ShippingOption[];
  selectedShippingMethod: string | null;
  shippingCost: number;
  freeShipping: { threshold: number; remaining: number; qualified: boolean } | null;
  giftWrap: { available: boolean; fee: number; selected: boolean };
  total: number;
  canCheckout: boolean;
  problems: QuoteProblem[];
}
