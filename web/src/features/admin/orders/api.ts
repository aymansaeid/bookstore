import type { OrderDocument } from '@/features/orders/types';
import type { OrderStatus } from '@/shared/api/enums';
import type { PagedResult } from '@/shared/api/types';

import { adminRequest } from '../session';

/** API §10 AdminOrderSummaryDto. */
export interface AdminOrderSummary {
  id: number;
  orderNumber: string;
  customerEmail: string;
  recipientName: string;
  countryCode: string;
  status: OrderStatus;
  itemCount: number;
  total: number;
  currency: string;
  createdAtUtc: string;
  paidAtUtc: string | null;
  shippedAtUtc: string | null;
}

export type OrderAction = 'Ship' | 'Deliver' | 'CorrectTracking' | 'Cancel';

/** API §10 AdminOrderDetailsDto. */
export interface AdminOrder {
  id: number;
  orderNumber: string;
  customerEmail: string;
  status: OrderStatus;
  shippingAddress: {
    recipientName: string;
    phone: string;
    line1: string;
    line2: string | null;
    city: string;
    stateOrProvince: string | null;
    postalCode: string;
    countryCode: string;
  };
  lines: {
    bookId: number;
    title: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  subtotal: number;
  shippingCost: number;
  /** Coupon part only. */
  discountAmount: number;
  total: number;
  currency: string;
  appliedCouponCode: string | null;
  shippingCarrier: string | null;
  trackingNumber: string | null;
  cancellationReason: string | null;
  checkoutSessionId: string | null;
  paymentReference: string | null;
  createdAtUtc: string;
  paidAtUtc: string | null;
  shippedAtUtc: string | null;
  deliveredAtUtc: string | null;
  cancelledAtUtc: string | null;
  /** Render buttons from this, never from the status (API §10). */
  allowedActions: OrderAction[];
  shippingMethodCode: string;
  shippingMethodName: string | null;
  giftWrap: boolean;
  giftWrapFee: number;
  giftMessage: string | null;
  cancelledByCustomer: boolean;
  pathDiscountAmount: number;
  readingPathId: number | null;
}

export interface OrderListFilter {
  status: OrderStatus | null;
  search: string;
  page: number;
}

export const ADMIN_ORDERS_PAGE_SIZE = 20;

const BASE = '/api/admin/orders';
const one = (id: number) => `${BASE}/${String(id)}`;

export const adminOrdersApi = {
  list: ({ status, search, page }: OrderListFilter, signal?: AbortSignal) =>
    adminRequest<PagedResult<AdminOrderSummary>>(BASE, {
      query: { status, search: search || undefined, page, pageSize: ADMIN_ORDERS_PAGE_SIZE },
      signal,
    }),
  get: (id: number) => adminRequest<AdminOrder>(one(id)),
  /** Emails the customer. */
  ship: (id: number, carrier: string, trackingNumber: string) =>
    adminRequest<AdminOrder>(`${one(id)}/ship`, {
      method: 'POST',
      body: { carrier, trackingNumber },
    }),
  /** Fixes a typo; no new email. */
  correctTracking: (id: number, carrier: string, trackingNumber: string) =>
    adminRequest<AdminOrder>(`${one(id)}/tracking`, {
      method: 'PUT',
      body: { carrier, trackingNumber },
    }),
  deliver: (id: number) => adminRequest<AdminOrder>(`${one(id)}/deliver`, { method: 'POST' }),
  /** Refunds if paid, restocks, gives the coupon use back, emails the customer. */
  cancel: (id: number, reason: string) =>
    adminRequest<AdminOrder>(`${one(id)}/cancel`, { method: 'POST', body: { reason } }),
  documents: (id: number) => adminRequest<OrderDocument[]>(`${one(id)}/documents`),
};
