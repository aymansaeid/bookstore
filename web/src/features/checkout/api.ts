import { apiRequest } from '@/shared/api/http';

import type { Quote, QuoteProblem, QuoteRequest } from './types';

type RawQuote = Omit<Quote, 'problems' | 'pathDiscountAmount'> & {
  problems?: unknown;
  pathDiscountAmount?: number;
};

/**
 * The guide shows `problems` as a list of codes; accept either bare strings
 * or { code, bookId } objects so a shape change can't break the cart.
 */
function normalizeProblems(raw: unknown): QuoteProblem[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[]).flatMap((item): QuoteProblem[] => {
    if (typeof item === 'string') return [{ code: item, bookId: null }];
    if (typeof item !== 'object' || item === null) return [];
    const record = item as Record<string, unknown>;
    const code =
      typeof record.code === 'string'
        ? record.code
        : typeof record.title === 'string'
          ? record.title
          : null;
    if (code === null) return [];
    return [{ code, bookId: typeof record.bookId === 'number' ? record.bookId : null }];
  });
}

export const checkoutApi = {
  /** Server-calculated cart; problems come back as data, never as errors (§5b). */
  quote: async (body: QuoteRequest, signal?: AbortSignal): Promise<Quote> => {
    const raw = await apiRequest<RawQuote>('/api/orders/quote', { method: 'POST', body, signal });
    return {
      ...raw,
      pathDiscountAmount: raw.pathDiscountAmount ?? 0,
      problems: normalizeProblems(raw.problems),
    };
  },
  /** Preview only; reserves nothing (§5). 400 Coupon.Invalid hides the reason by design. */
  checkCoupon: (code: string) =>
    apiRequest<{ code: string; discountPercentage: number }>('/api/coupons/check', {
      method: 'POST',
      body: { code },
    }),
};
