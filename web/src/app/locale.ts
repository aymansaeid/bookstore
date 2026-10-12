/** Only Arabic ships for now (API guide §13 item 15). */
export const UI_LANGUAGE = 'ar' as const;
export type UiLanguage = 'ar' | 'tr' | 'en';

/** API guide §2: show every timestamp in the store's zone. */
export const STORE_TIME_ZONE = 'Europe/Istanbul';

/** The shop's own country: free-shipping threshold and store pickup apply here. */
export const STORE_COUNTRY = 'TR';
