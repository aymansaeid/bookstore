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

/** API §5 ShippingAddressDto. For pickup only recipientName and phone matter. */
export interface ShippingAddressInput {
  recipientName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  stateOrProvince: string | null;
  postalCode: string;
  countryCode: string;
}

/** API §5 / §5b / §5c. Exactly one of shippingAddress and savedAddressId. */
export interface CheckoutRequest {
  customerEmail: string;
  lines: { bookId: number; quantity: number }[];
  shippingAddress: ShippingAddressInput | null;
  savedAddressId: number | null;
  couponCode: string | null;
  acceptedTermsVersion: string;
  shippingMethod: string | null;
  giftWrap: boolean;
  giftMessage: string | null;
  language: string;
  readingPathId: number | null;
}

export interface CheckoutResponse {
  orderNumber: string;
  checkoutUrl: string;
  expiresAtUtc: string;
}

/** API §5c POST /api/legal/checkout-preview. */
export interface LegalPreviewRequest {
  language: string;
  quote: Omit<QuoteRequest, 'readingPathId'>;
  buyer: {
    name: string;
    email: string | null;
    phone: string;
    line1: string | null;
    line2: string | null;
    city: string | null;
    stateOrProvince: string | null;
    postalCode: string | null;
    countryCode: string | null;
  };
}

export type LegalDocumentType = 'PreInformationForm' | 'DistanceSalesContract';

export interface RenderedLegalDocument {
  type: LegalDocumentType;
  version: string;
  title: string;
  /** Safe server-rendered fragment (no scripts possible), §5c. */
  html: string;
}

export interface LegalPreview {
  preInformationForm: RenderedLegalDocument | null;
  distanceSalesContract: RenderedLegalDocument | null;
}

/** Development stand-in for the payment provider (API §5, mock payment page). */
export interface MockPaymentSession {
  sessionId: string;
  orderNumber: string;
  total: number;
  currency: string;
  expiresAtUtc: string;
  status: 'Open' | 'Completed' | 'Expired';
}
