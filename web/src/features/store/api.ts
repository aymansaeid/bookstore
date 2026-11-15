import type { UiLanguage } from '@/app/locale';
import { apiRequest } from '@/shared/api/http';

/** API guide §4, §2b StoreConfigDto, for the page's language. */
export interface StoreConfig {
  storeName: string;
  currency: string;
  /** Checkout must send this back as acceptedTermsVersion (§5c). */
  termsVersion: string;
  checkoutSessionMinutes: number;
  isTestMode: boolean;
  /** The language this config answered in. */
  language: UiLanguage;
  /** The language of the contract the buyer will see (English falls back to Arabic). */
  termsLanguage: UiLanguage | null;
  /** False: checkout in this language isn't open yet (Turkish until its texts are published). */
  termsAvailable: boolean;
  /** Store-wide announcement in this language, set by the store; null for the default text. */
  announcement: string | null;
  supportedLanguages: UiLanguage[];
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

/** API guide §7b GET /api/store/stats (cached 10 min server-side). */
export interface StoreStats {
  bookCount: number;
  muhaqqiqCount: number;
  averageRating: number | null;
  reviewCount: number;
  countriesShippedTo: number;
}

export const storeApi = {
  config: (language: UiLanguage, signal?: AbortSignal) =>
    apiRequest<StoreConfig>('/api/store/config', { query: { lang: language }, signal }),
  shippingRates: (signal?: AbortSignal) =>
    apiRequest<ShippingRate[]>('/api/shipping/rates', { signal }),
  stats: (signal?: AbortSignal) => apiRequest<StoreStats>('/api/store/stats', { signal }),
};
