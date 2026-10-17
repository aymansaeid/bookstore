import type { CancelReason } from '@/shared/api/enums';
import { apiRequest } from '@/shared/api/http';

import type { OrderDocument, OrderLookup, PublicOrder } from './types';

/**
 * API §6. Every call is a POST so the email never lands in URLs or logs, and
 * they share the 10-per-minute order-lookup limit. A wrong number and a wrong
 * email both give 404 Order.TrackingNotFound.
 */
export const ordersApi = {
  track: (orderNumber: string, email: string) =>
    apiRequest<PublicOrder>('/api/orders/track', {
      method: 'POST',
      body: { orderNumber, email },
    }),

  /** Until shipping. Paid orders are refunded automatically (§6). */
  cancel: (lookup: OrderLookup, reason: CancelReason, comment: string | null) =>
    apiRequest<PublicOrder>('/api/orders/cancel', {
      method: 'POST',
      body: { ...lookup, reason, comment },
    }),

  documents: (lookup: OrderLookup) =>
    apiRequest<OrderDocument[]>('/api/orders/documents', { method: 'POST', body: lookup }),
};
