import { optionalCustomerRequest } from '@/features/auth/session';
import { apiRequest } from '@/shared/api/http';

import type {
  CheckoutRequest,
  CheckoutResponse,
  LegalPreview,
  LegalPreviewRequest,
  MockPaymentSession,
  Quote,
  QuoteProblem,
  QuoteRequest,
} from './types';

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
  /**
   * Server-calculated cart; problems come back as data, never as errors (§5b).
   * Sends the customer token when signed in, which savedAddressId needs.
   */
  quote: async (body: QuoteRequest, signal?: AbortSignal): Promise<Quote> => {
    const raw = await optionalCustomerRequest<RawQuote>('/api/orders/quote', {
      method: 'POST',
      body,
      signal,
    });
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

  /** Both documents filled in with the current cart (§5c). Shares the quote's 30/min limit. */
  legalPreview: (body: LegalPreviewRequest) =>
    optionalCustomerRequest<LegalPreview>('/api/legal/checkout-preview', {
      method: 'POST',
      body,
    }),

  /** §5: the same key returns the same order and checkoutUrl and holds no extra stock. */
  checkout: (body: CheckoutRequest, idempotencyKey: string) =>
    optionalCustomerRequest<CheckoutResponse>('/api/orders/checkout', {
      method: 'POST',
      body,
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
};

/** Development only: the mock payment provider (§5, "The mock payment page"). */
export const mockPaymentsApi = {
  session: (sessionId: string) =>
    apiRequest<MockPaymentSession>(`/api/dev/payments/${encodeURIComponent(sessionId)}`),
  /** 409 = session expired or already closed. */
  pay: (sessionId: string) =>
    apiRequest<unknown>(`/api/dev/payments/${encodeURIComponent(sessionId)}/simulate-paid`, {
      method: 'POST',
    }),
};
