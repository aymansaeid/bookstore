import { useEffect } from 'react';

import { useCartStore } from '@/features/cart/cartStore';
import { codeMessage } from '@/shared/api/errorMessages';
import { toast } from '@/shared/ui/toast/toastStore';

import type { Quote, QuoteRequest } from './types';

interface QuoteState {
  data: Quote | undefined;
  isCurrent: boolean;
  request: QuoteRequest;
}

/**
 * Quote problems the cart can fix by itself (API §5b), applied only to a quote
 * that matches the cart right now: drop removed books, fall back to the
 * standard shipping method, untick gift wrap when it's no longer offered.
 */
export function useQuoteSelfHeal({ data, isCurrent, request }: QuoteState): void {
  useEffect(() => {
    if (!data || !isCurrent) return;
    const cart = useCartStore.getState();
    const codes = new Set(data.problems.map((problem) => problem.code));

    if (codes.has('Checkout.BookNotFound')) {
      const present = new Set(data.lines.map((line) => line.bookId));
      const gone = request.lines
        .filter((line) => !present.has(line.bookId))
        .map((line) => line.bookId);
      if (gone.length > 0) {
        cart.removeMany(gone);
        toast.error(codeMessage('Checkout.BookNotFound'));
      }
    }
    if (codes.has('Checkout.ShippingMethodUnavailable') && cart.shippingMethod !== null) {
      cart.setShippingMethod(null);
    }
    if (codes.has('Checkout.GiftWrapUnavailable') && cart.giftWrap) {
      cart.setGiftWrap(false);
    }
  }, [data, isCurrent, request]);
}
