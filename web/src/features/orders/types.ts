import type { OrderStatus } from '@/shared/api/enums';

/** API §6 PublicOrderDto: city and country only, never the street or phone. */
export interface PublicOrderLine {
  title: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  bookId: number;
  /** null when the book was removed since. */
  bookSlug: string | null;
  coverImageUrl: string | null;
  coverThumbnailUrl: string | null;
}

export interface PublicOrder {
  orderNumber: string;
  status: OrderStatus;
  lines: PublicOrderLine[];
  subtotal: number;
  shippingCost: number;
  /** Coupon part. */
  discountAmount: number;
  pathDiscountAmount: number;
  total: number;
  currency: string;
  shipToCity: string;
  shipToCountryCode: string;
  shippingCarrier: string | null;
  trackingNumber: string | null;
  createdAtUtc: string;
  shippedAtUtc: string | null;
  deliveredAtUtc: string | null;
  shippingMethodCode: string;
  shippingMethodName: string | null;
  giftWrap: boolean;
  giftWrapFee: number;
  canBeCancelled: boolean;
  readingPathId: number | null;
}
