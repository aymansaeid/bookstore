import { STORE_TIME_ZONE } from '@/app/locale';

/**
 * Spec §8.5 and API guide §2: Eastern Arabic digits, ₺, Istanbul time.
 * Formatters are created once; Intl constructors are expensive.
 */
const arabic = new Intl.NumberFormat('ar-EG');
const arabicPlain = new Intl.NumberFormat('ar-EG', { useGrouping: false });
const arabicAmount = new Intl.NumberFormat('ar-EG', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const arabicDate = new Intl.DateTimeFormat('ar-EG', {
  timeZone: STORE_TIME_ZONE,
  dateStyle: 'long',
});
const arabicDateTime = new Intl.DateTimeFormat('ar-EG', {
  timeZone: STORE_TIME_ZONE,
  dateStyle: 'long',
  timeStyle: 'short',
});
const arabicPlainDate = new Intl.DateTimeFormat('ar-EG', { timeZone: 'UTC', dateStyle: 'long' });
const regionNames = new Intl.DisplayNames(['ar'], { type: 'region' });

const NBSP = '\u00A0';

export const formatCount = (value: number): string => arabic.format(value);

/** Counter bubbles: 1–99, then "٩٩+". */
export const formatBadgeCount = (value: number): string =>
  value > 99 ? `${arabic.format(99)}+` : arabic.format(value);

/** Years must not be grouped: ٢٠٢٦, not ٢٬٠٢٦. */
export const formatYear = (year: number): string => arabicPlain.format(year);

/** "٢٬٤٠٠" or "١٬٣٠٤٫٠٥". Decimals only when they aren't zero. */
export const formatAmount = (amount: number): string => arabicAmount.format(amount);

/**
 * "٢٬٤٠٠ ₺". The store currency is TRY; anything else falls back to Intl's
 * own currency display so a wrong symbol is never shown.
 */
export function formatMoney(amount: number, currency = 'TRY'): string {
  if (currency === 'TRY') return `${arabicAmount.format(amount)}${NBSP}₺`;
  return new Intl.NumberFormat('ar-EG', { style: 'currency', currency }).format(amount);
}

/** ISO 8601 timestamp (UTC) → date in Istanbul. */
export const formatDate = (iso: string): string => arabicDate.format(new Date(iso));

/** ISO 8601 timestamp (UTC) → date and time in Istanbul. */
export const formatDateTime = (iso: string): string => arabicDateTime.format(new Date(iso));

/** Plain "2026-09-30" dates must not shift a day with the time zone. */
export const formatPlainDate = (date: string): string =>
  arabicPlainDate.format(new Date(`${date}T12:00:00Z`));

/** API country names are English; spec wants Arabic (API guide §4). */
export function countryName(code: string): string {
  try {
    return regionNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** Arabic number agreement for countries: دولة واحدة، دولتان، ٥ دول، ٦٢ دولة. */
export function countriesPhrase(count: number): string {
  if (count === 1) return 'دولة واحدة';
  if (count === 2) return 'دولتين';
  if (count >= 3 && count <= 10) return `${formatCount(count)} دول`;
  return `${formatCount(count)} دولة`;
}

/** Arabic number agreement: مجلد واحد، مجلدان، ٦ مجلدات، ٥٠ مجلداً. */
export function volumesLabel(count: number): string {
  if (count <= 1) return 'مجلد واحد';
  if (count === 2) return 'مجلدان';
  if (count <= 10) return `${formatCount(count)} مجلدات`;
  return `${formatCount(count)} مجلداً`;
}
