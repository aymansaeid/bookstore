import { useQuery } from '@tanstack/react-query';

import { STORE_COUNTRY, UI_LANGUAGE, type UiLanguage } from '@/app/locale';

import { storeApi } from './api';

const STORE = ['store'] as const;

export const storeKeys = {
  config: (language: UiLanguage) => [...STORE, 'config', language] as const,
  shippingRates: () => [...STORE, 'shipping-rates'] as const,
};

/** Loaded once on start (API guide §4); checkout reads termsVersion from it. */
export function useStoreConfig() {
  return useQuery({
    queryKey: storeKeys.config(UI_LANGUAGE),
    queryFn: ({ signal }) => storeApi.config(UI_LANGUAGE, signal),
    staleTime: 5 * 60_000,
  });
}

export function useShippingRates() {
  return useQuery({
    queryKey: storeKeys.shippingRates(),
    queryFn: ({ signal }) => storeApi.shippingRates(signal),
    staleTime: 10 * 60_000,
  });
}

/**
 * Numbers for the announcement bar: the home-country free-shipping threshold
 * and how many countries we deliver to. Undefined while loading or on error,
 * and the bar then falls back to general wording.
 */
export function useShippingSummary() {
  const { data } = useShippingRates();
  const home = data?.find((rate) => rate.countryCode === STORE_COUNTRY);
  return {
    freeShippingThreshold: home?.freeShippingThreshold ?? undefined,
    countries: data && data.length > 0 ? data.length : undefined,
  };
}
