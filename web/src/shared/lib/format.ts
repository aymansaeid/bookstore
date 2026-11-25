import { STORE_TIME_ZONE, UI_LANGUAGE, UI_LOCALE } from '@/app/locale';
import { i18n } from '@/i18n';

/**
- Spec §8.5 and API guide §2: numbers and dates in the page's language
- (Eastern Arabic digits in Arabic, Latin digits in English and Turkish), ₺,
- Istanbul time. The language is fixed per page load, so formatters are
- created once; Intl constructors are expensive.
 */
const arabic = new Intl.NumberFormat(UI_LOCALE);
const arabicPlain = new Intl.NumberFormat(UI_LOCALE, { useGrouping: false });
const arabicAmount = new Intl.NumberFormat(UI_LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const arabicDate = new Intl.DateTimeFormat(UI_LOCALE, {
  timeZone: STORE_TIME_ZONE,
  dateStyle: 'long',
});
const arabicDateTime = new Intl.DateTimeFormat(UI_LOCALE, {
  timeZone: STORE_TIME_ZONE,
  dateStyle: 'long',
  timeStyle: 'short',
});
const arabicPlainDate = new Intl.DateTimeFormat(UI_LOCALE, { timeZone: 'UTC', dateStyle: 'long' });
const regionNames = new Intl.DisplayNames([UI_LANGUAGE], { type: 'region' });

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
- "٢٬٤٠٠ ₺". The store currency is TRY; anything else falls back to Intl's
- own currency display so a wrong symbol is never shown.
 */
export function formatMoney(amount: number, currency = 'TRY'): string {
  if (currency === 'TRY') {
    return UI_LANGUAGE === 'en'
      ? `₺${arabicAmount.format(amount)}`
      : `${arabicAmount.format(amount)}${NBSP}₺`;
  }
  return new Intl.NumberFormat(UI_LOCALE, { style: 'currency', currency }).format(amount);
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

/** Nouns counted in the page's language (common.json → count). */
type Counted = 'countries' | 'volumes' | 'results' | 'editions' | 'works' | 'books' | 'copies';

/**
- "٥ دول" / "5 countries" / "5 ülke". Arabic has six plural forms (zero,
- one, two, few 3–10, many 11–99, other), English and Turkish two; i18next
- picks the form from `count`, and `n` is the number in the page's digits.
 */
const counted = (noun: Counted, count: number): string =>
  i18n.t(`count.${noun}`, { count, n: formatCount(count) });

/** دولة واحدة، دولتين، ٥ دول، ٦٢ دولة. */
export const countriesPhrase = (count: number): string => counted('countries', count);

/** مجلد واحد، مجلدان، ٦ مجلدات، ٥٠ مجلداً. */
export const volumesLabel = (count: number): string => counted('volumes', Math.max(count, 1));

interface PluralForms {
  one: string;
  two: string;
  /** 3–10: «٥ نتائج» */
  few: string;
  /** 11+: «٢٤ نتيجة» */
  many: string;
}

/** Arabic number agreement for any noun. */
export function arabicPlural(count: number, forms: PluralForms): string {
  if (count === 1) return forms.one;
  if (count === 2) return forms.two;
  if (count >= 3 && count <= 10) return `${formatCount(count)} ${forms.few}`;
  return `${formatCount(count)} ${forms.many}`;
}

export const resultsPhrase = (count: number): string => counted('results', count);

export const editionsPhrase = (count: number): string => counted('editions', count);

export const worksPhrase = (count: number): string => counted('works', count);

export const booksPhrase = (count: number): string => counted('books', count);

export const copiesPhrase = (count: number): string => counted('copies', count);