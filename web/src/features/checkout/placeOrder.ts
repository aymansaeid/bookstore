import { ApiError } from '@/shared/api/ApiError';

import { checkoutApi } from './api';
import { useCheckoutStore } from './checkoutStore';
import type { CheckoutRequest, CheckoutResponse } from './types';

/**
 * POST /api/orders/checkout with the right Idempotency-Key (API §5):
 * - the same request as last time reuses its key, so a double click, a retry
 *   after a network error or a return from the payment page gets the same
 *   order and checkoutUrl, and holds no extra stock;
 * - any change to the request gets a new key;
 * - 409 Checkout.IdempotencyKeyReused: make a new key and retry once.
 */
export async function placeOrder(request: CheckoutRequest): Promise<CheckoutResponse> {
  const store = useCheckoutStore.getState();
  let response: CheckoutResponse;
  try {
    response = await checkoutApi.checkout(request, store.keyFor(request));
  } catch (error) {
    if (!(error instanceof ApiError) || error.code !== 'Checkout.IdempotencyKeyReused') throw error;
    store.clearAttempt();
    response = await checkoutApi.checkout(request, store.keyFor(request));
  }
  store.recordOrder(response);
  return response;
}

/**
 * Leaves the store for the payment page. Only http(s) URLs are followed, so a
 * malformed response can never run script in our origin.
 */
export function redirectToPayment(checkoutUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(checkoutUrl, window.location.origin);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  window.location.assign(url.href);
  return true;
}
