import { customerRequest } from '@/features/auth/session';
import type { LoyaltyTier } from '@/shared/api/enums';

/** API guide §7e: the four «لوحتي» cards and the header badges in one call. */
export interface CustomerSummary {
  orderCount: number;
  booksOwned: number;
  wishlistCount: number;
  loyaltyPoints: number;
  loyaltyTier: LoyaltyTier;
  unreadNotifications: number;
}

export const accountApi = {
  summary: (signal?: AbortSignal) =>
    customerRequest<CustomerSummary>('/api/customers/me/summary', { signal }),
  unreadNotificationsCount: (signal?: AbortSignal) =>
    customerRequest<number>('/api/customers/me/notifications/unread-count', { signal }),
};
