import type { UiLanguage } from '@/app/locale';
import { apiRequest } from '@/shared/api/http';

/** API guide §4 StoreConfigDto. */
export interface StoreConfig {
  storeName: string;
  currency: string;
  /** Checkout must send this back as acceptedTermsVersion (§5c). */
  termsVersion: string;
  checkoutSessionMinutes: number;
  isTestMode: boolean;
}

/** API guide §4 / §5b PublicShippingRateDto. One row per country. */
export interface ShippingRate {
  countryCode: string;
  /** English. Display countryName(countryCode) instead. */
  countryName: string;
  flatRate: number;
  currency: string;
  freeShippingThreshold: number | null;
}

export const storeApi = {
  config: (language: UiLanguage, signal?: AbortSignal) =>
    apiRequest<StoreConfig>('/api/store/config', { query: { lang: language }, signal }),
  shippingRates: (signal?: AbortSignal) =>
    apiRequest<ShippingRate[]>('/api/shipping/rates', { signal }),
};
