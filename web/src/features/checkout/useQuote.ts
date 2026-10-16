import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useCartStore } from '@/features/cart/cartStore';
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue';

import { checkoutApi } from './api';
import type { QuoteRequest } from './types';

export const quoteKeys = {
  all: ['quote'] as const,
  detail: (request: QuoteRequest) => ['quote', request] as const,
};

/**
 * Quote for the current cart. Requests are debounced (300 ms) so quick
 * quantity clicks send one request: the quote is rate-limited to 30/min.
 */
export function useQuote(overrides: Partial<QuoteRequest> = {}) {
  const lines = useCartStore((state) => state.lines);
  const couponCode = useCartStore((state) => state.couponCode);
  const giftWrap = useCartStore((state) => state.giftWrap);
  const readingPathId = useCartStore((state) => state.readingPathId);
  const countryCode = useCartStore((state) => state.countryCode);
  const shippingMethod = useCartStore((state) => state.shippingMethod);
  const { savedAddressId = null } = overrides;
  const overrideCountry = overrides.countryCode;

  const request = useMemo<QuoteRequest>(
    () => ({
      lines,
      countryCode: overrideCountry ?? countryCode,
      savedAddressId,
      couponCode,
      shippingMethod,
      giftWrap,
      readingPathId,
    }),
    [
      lines,
      overrideCountry,
      countryCode,
      savedAddressId,
      couponCode,
      shippingMethod,
      giftWrap,
      readingPathId,
    ],
  );
  const debounced = useDebouncedValue(request, 300);

  const query = useQuery({
    queryKey: quoteKeys.detail(debounced),
    queryFn: ({ signal }) => checkoutApi.quote(debounced, signal),
    enabled: debounced.lines.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  /** True only when the shown quote matches what's in the cart right now. */
  const isCurrent = request === debounced && !query.isPlaceholderData && !query.isFetching;
  return { ...query, request: debounced, isCurrent };
}
