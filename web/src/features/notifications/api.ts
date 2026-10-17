import { customerRequest } from '@/features/auth/session';
import type { PagedResult } from '@/shared/api/types';

/** API §7c. Facts, not sentences: the frontend words each type. */
export type NotificationType =
  'OrderShipped' | 'BackInStock' | 'PriceDrop' | 'NewFromFollowedMuhaqqiq';

export interface CustomerNotification {
  id: number;
  type: NotificationType;
  createdAtUtc: string;
  isRead: boolean;
  bookId: number | null;
  bookTitle: string | null;
  bookSlug: string | null;
  coverThumbnailUrl: string | null;
  orderNumber: string | null;
  muhaqqiqId: number | null;
  muhaqqiqName: string | null;
  muhaqqiqSlug: string | null;
  oldPrice: number | null;
  newPrice: number | null;
  currency: string | null;
}

export interface NotificationsPage {
  notifications: PagedResult<CustomerNotification>;
  unreadCount: number;
}

const BASE = '/api/customers/me/notifications';
export const NOTIFICATIONS_PAGE_SIZE = 20;

export const notificationsApi = {
  list: (page: number, unreadOnly: boolean) =>
    customerRequest<NotificationsPage>(BASE, {
      query: { page, pageSize: NOTIFICATIONS_PAGE_SIZE, unreadOnly },
    }),
  markRead: (id: number) =>
    customerRequest<undefined>(`${BASE}/${String(id)}/read`, { method: 'POST' }),
  markAllRead: () => customerRequest<undefined>(`${BASE}/read-all`, { method: 'POST' }),
};
