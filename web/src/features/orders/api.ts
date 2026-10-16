import { apiRequest } from '@/shared/api/http';

import type { PublicOrder } from './types';

export const ordersApi = {
  /**
   * API §6: a POST so the email never lands in URLs or logs. 404
   * Order.TrackingNotFound for a wrong number or email alike. 10 per minute.
   */
  track: (orderNumber: string, email: string) =>
    apiRequest<PublicOrder>('/api/orders/track', {
      method: 'POST',
      body: { orderNumber, email },
    }),
};
