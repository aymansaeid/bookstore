import type { OrderStatus, ReturnStatus } from '@/shared/api/enums';

import { adminRequest } from '../session';

/** API §10c ⌘K. Groups hold up to 5 results each. */
export interface SearchOrder {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  currency: string;
  customerEmail: string;
  recipientName: string;
  createdAtUtc: string;
  paidAtUtc: string | null;
}

export interface SearchCustomer {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  orderCount: number;
}

export interface SearchBook {
  id: number;
  title: string;
  author: string;
  slug: string;
  /** Hidden books are included. */
  isActive: boolean;
  availableToSell: number;
  price: number;
  currency: string;
  coverThumbnailUrl: string | null;
}

export interface SearchReturn {
  id: number;
  orderNumber: string;
  status: ReturnStatus;
  customerEmail: string;
  requestedAtUtc: string;
}

export interface SearchCoupon {
  id: number;
  code: string;
  discountPercentage: number;
  isActive: boolean;
  expiresAtUtc: string;
}

/** What needs attention now: only for an empty box (under 2 characters). */
export interface QuickViews {
  awaitingShipment: number;
  /** Paid more than 48 hours ago, still not shipped. */
  lateShipments: number;
  returnsToReview: number;
  returnsInTransit: number;
  pendingReviews: number;
  lowStock: number;
  /** Up to 5, longest waiting first. */
  lateOrders: SearchOrder[];
}

export interface AdminSearchResult {
  query: string | null;
  orders: SearchOrder[];
  customers: SearchCustomer[];
  books: SearchBook[];
  returns: SearchReturn[];
  coupons: SearchCoupon[];
  quickViews: QuickViews | null;
}

/** Fewer characters than this returns quick views instead of results. */
export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 100;

export const adminSearchApi = {
  search: (q: string, signal?: AbortSignal) =>
    adminRequest<AdminSearchResult>('/api/admin/search', {
      query: { q: q || undefined },
      signal,
    }),
};