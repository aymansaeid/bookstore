import { customerRequest } from '@/features/auth/session';
import type { Customer } from '@/features/auth/types';
import type { PublicOrder } from '@/features/orders/types';
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

export interface ProfileUpdate {
  firstName: string;
  lastName: string;
  phone: string | null;
  acceptsMarketingEmails: boolean;
}

export const accountApi = {
  summary: (signal?: AbortSignal) =>
    customerRequest<CustomerSummary>('/api/customers/me/summary', { signal }),
  unreadNotificationsCount: (signal?: AbortSignal) =>
    customerRequest<number>('/api/customers/me/notifications/unread-count', { signal }),

  /** API §6: every order of this customer, newest first (guest orders join once verified). */
  orders: () => customerRequest<PublicOrder[]>('/api/customers/me/orders'),

  /** API §7: returns the updated profile. */
  updateProfile: (body: ProfileUpdate) =>
    customerRequest<Customer>('/api/customers/me', { method: 'PUT', body }),

  /** 204. Signs out every device, this one included (API §7). */
  changePassword: (currentPassword: string, newPassword: string) =>
    customerRequest<undefined>('/api/customers/me/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    }),

  /** 204. Permanent (KVKK): orders stay anonymised, everything else is deleted (API §7). */
  deleteAccount: (password: string) =>
    customerRequest<undefined>('/api/customers/me/delete', {
      method: 'POST',
      body: { password },
    }),
};
