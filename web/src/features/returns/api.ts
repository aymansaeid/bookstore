import type { OrderLookup } from '@/features/orders/types';
import { ApiError } from '@/shared/api/ApiError';
import { apiRequest } from '@/shared/api/http';

import type { PublicReturn, ReturnEligibility, ReturnRequestBody } from './types';

/** API §9: all POST, no token, the order-lookup limit (10 a minute). */
export const returnsApi = {
  eligibility: (lookup: OrderLookup) =>
    apiRequest<ReturnEligibility>('/api/returns/eligibility', { method: 'POST', body: lookup }),

  /** The latest return for the order, or null when there has been none. */
  status: async (lookup: OrderLookup): Promise<PublicReturn | null> => {
    try {
      return await apiRequest<PublicReturn>('/api/returns/status', {
        method: 'POST',
        body: lookup,
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'Return.NoReturnForOrder') return null;
      throw error;
    }
  },

  request: (lookup: OrderLookup, body: ReturnRequestBody) =>
    apiRequest<PublicReturn>('/api/returns', { method: 'POST', body: { ...lookup, ...body } }),

  /** Only while Requested or Approved. */
  cancel: (lookup: OrderLookup) =>
    apiRequest<PublicReturn>('/api/returns/cancel', { method: 'POST', body: lookup }),
};

export const returnKeys = {
  eligibility: (lookup: OrderLookup) => ['return-eligibility', lookup] as const,
  status: (lookup: OrderLookup) => ['return-status', lookup] as const,
};
