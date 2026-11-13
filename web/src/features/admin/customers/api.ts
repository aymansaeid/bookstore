import type { LoyaltySummary, LoyaltyTransaction } from '@/features/loyalty/api';
import type { LoyaltyTier, OrderStatus, ReaderLevel } from '@/shared/api/enums';
import type { PagedResult } from '@/shared/api/types';

import { adminRequest } from '../session';

/** API §10b status filter. Without one: everyone except anonymized accounts. */
export type CustomerStatus = 'Active' | 'Inactive' | 'Unverified' | 'Anonymized';

export type CustomerSort = 'Newest' | 'Oldest' | 'TopSpenders' | 'MostOrders' | 'RecentlyActive';

export type CustomerAction =
  'Deactivate' | 'Activate' | 'AdjustPoints' | 'SignOutEverywhere' | 'ResendVerification';

/** API §10b AdminCustomerSummaryDto (list rows). */
export interface AdminCustomerSummary {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  isEmailVerified: boolean;
  isActive: boolean;
  isAnonymized: boolean;
  createdAtUtc: string;
  lastLoginAtUtc: string | null;
  /** Paid, shipped and delivered orders only, before return refunds. */
  orderCount: number;
  totalSpent: number;
  currency: string;
  lastOrderAtUtc: string | null;
  loyaltyPoints: number;
  loyaltyTier: LoyaltyTier;
}

/** API §10b header cards. */
export interface AdminCustomerOverview {
  total: number;
  active: number;
  inactive: number;
  unverified: number;
  newLast30Days: number;
  withOrders: number;
  anonymized: number;
}

export interface AdminCustomerAddress {
  id: number;
  label: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  stateOrProvince: string | null;
  postalCode: string;
  countryCode: string;
  isDefault: boolean;
}

export interface AdminCustomerOrder {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  currency: string;
  itemCount: number;
  createdAtUtc: string;
  paidAtUtc: string | null;
}

/** API §10b AdminCustomerDto (profile page). */
export interface AdminCustomer {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string | null;
  isEmailVerified: boolean;
  emailVerifiedAtUtc: string | null;
  isActive: boolean;
  isAnonymized: boolean;
  acceptsMarketingEmails: boolean;
  createdAtUtc: string;
  lastLoginAtUtc: string | null;
  readingLevel: ReaderLevel | null;
  monthlyBudget: number | null;
  interests: { id: number; slug: string; name: string }[];
  /** Default first. */
  addresses: AdminCustomerAddress[];
  stats: {
    orderCount: number;
    cancelledOrderCount: number;
    totalSpent: number;
    refundedTotal: number;
    /** totalSpent minus completed return refunds. */
    netSpent: number;
    averageOrderValue: number;
    currency: string;
    firstOrderAtUtc: string | null;
    lastOrderAtUtc: string | null;
  };
  activity: {
    booksOwned: number;
    wishlistCount: number;
    approvedReviews: number;
    pendingReviews: number;
    openReturns: number;
    /** Devices signed in right now. */
    activeSessions: number;
  };
  loyalty: LoyaltySummary;
  /** The 10 newest, every status. */
  recentOrders: AdminCustomerOrder[];
  /** Render buttons from this only. Empty for anonymized accounts. */
  allowedActions: CustomerAction[];
}

export interface CustomerListFilter {
  status: CustomerStatus | null;
  sort: CustomerSort;
  search: string;
  page: number;
}

export const ADMIN_CUSTOMERS_PAGE_SIZE = 20;
export const POINTS_HISTORY_PAGE_SIZE = 10;

const BASE = '/api/admin/customers';
const one = (id: number) => `${BASE}/${String(id)}`;

export const adminCustomersApi = {
  list: ({ status, sort, search, page }: CustomerListFilter, signal?: AbortSignal) =>
    adminRequest<PagedResult<AdminCustomerSummary>>(BASE, {
      query: {
        status,
        sort: sort === 'Newest' ? undefined : sort,
        search: search || undefined,
        page,
        pageSize: ADMIN_CUSTOMERS_PAGE_SIZE,
      },
      signal,
    }),
  overview: () => adminRequest<AdminCustomerOverview>(`${BASE}/stats`),
  get: (id: number) => adminRequest<AdminCustomer>(one(id)),
  /** Deactivating also signs the customer out on every device. */
  setActive: (id: number, isActive: boolean) =>
    adminRequest<undefined>(`${one(id)}/active`, { method: 'PUT', body: { isActive } }),
  signOutEverywhere: (id: number) =>
    adminRequest<undefined>(`${one(id)}/sign-out`, { method: 'POST' }),
  /** Same 60-second cooldown as the customer's own button. */
  resendVerification: (id: number) =>
    adminRequest<undefined>(`${one(id)}/resend-verification`, { method: 'POST' }),
  pointsHistory: (id: number, page: number) =>
    adminRequest<PagedResult<LoyaltyTransaction>>(`${one(id)}/loyalty/history`, {
      query: { page, pageSize: POINTS_HISTORY_PAGE_SIZE },
    }),
  /**
   * Positive adds, negative removes. The note is shown to the customer. The
   * key is made when the form opens, so a double submit adds the points once.
   */
  adjustPoints: (id: number, points: number, note: string, idempotencyKey: string) =>
    adminRequest<LoyaltySummary>(`${one(id)}/loyalty/adjustments`, {
      method: 'POST',
      body: { points, note },
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
};