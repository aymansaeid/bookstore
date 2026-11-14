import { env } from './env';

/**
 * UI languages. Arabic is the default and lives at the root (/books/…);
 * the others under a prefix (/en/books/…, /tr/books/…), so every language
 * has its own URL for search engines and sharing, and the links the backend
 * already puts in emails keep working.
 *
 * The language is fixed for the life of the page: switching reloads at the
 * new URL. That keeps every formatter and the router's basename simple.
 */
export type UiLanguage = 'ar' | 'en' | 'tr';
export type TextDirection = 'rtl' | 'ltr';

export const DEFAULT_LANGUAGE: UiLanguage = 'ar';
export const LANGUAGES: readonly UiLanguage[] = ['ar', 'en', 'tr'];

/** Shown in the switcher in their own script, never translated. */
export const LANGUAGE_NAMES: Readonly<Record<UiLanguage, string>> = {
  ar: 'العربية',
  en: 'English',
  tr: 'Türkçe',
};

/** Intl locale per UI language: Eastern Arabic digits only in Arabic (spec §8.5). */
const INTL_LOCALES: Readonly<Record<UiLanguage, string>> = {
  ar: 'ar-EG',
  en: 'en-GB',
  tr: 'tr-TR',
};

const DIRECTIONS: Readonly<Record<UiLanguage, TextDirection>> = {
  ar: 'rtl',
  en: 'ltr',
  tr: 'ltr',
};

export const isUiLanguage = (value: unknown): value is UiLanguage =>
  typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);

/** Arabic plus whatever VITE_LANGUAGES switches on. */
export const ENABLED_LANGUAGES: readonly UiLanguage[] = LANGUAGES.filter(
  (language) => language === DEFAULT_LANGUAGE || env.languages.includes(language),
);

const PREFIX = /^\/(en|tr)(?=\/|$)/;

/** "/en/books/x" → { language: 'en', path: '/books/x' }. No prefix is Arabic. */
export function splitLanguage(pathname: string): { prefix: UiLanguage | null; path: string } {
  const match = PREFIX.exec(pathname);
  if (!match) return { prefix: null, path: pathname };
  return { prefix: match[1] as UiLanguage, path: pathname.slice(match[0].length) || '/' };
}

/** The same page in another language. `path` is without any language prefix. */
export function pathInLanguage(language: UiLanguage, path: string): string {
  if (language === DEFAULT_LANGUAGE) return path;
  return path === '/' ? `/${language}` : `/${language}${path}`;
}

function detectLanguage(): UiLanguage {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  const { prefix } = splitLanguage(window.location.pathname);
  return prefix && ENABLED_LANGUAGES.includes(prefix) ? prefix : DEFAULT_LANGUAGE;
}

/** This page's language. */
export const UI_LANGUAGE: UiLanguage = detectLanguage();
/** For Intl formatters and localeCompare. */
export const UI_LOCALE: string = INTL_LOCALES[UI_LANGUAGE];
export const UI_DIRECTION: TextDirection = DIRECTIONS[UI_LANGUAGE];
/** React Router basename: every <Link to="/books/x"> becomes /en/books/x on English pages. */
export const ROUTER_BASENAME: string | undefined =
  UI_LANGUAGE === DEFAULT_LANGUAGE ? undefined : `/${UI_LANGUAGE}`;

export const directionOf = (language: UiLanguage): TextDirection => DIRECTIONS[language];

/** API guide §2: show every timestamp in the store's zone. */
export const STORE_TIME_ZONE = 'Europe/Istanbul';

/** The shop's own country: free-shipping threshold and store pickup apply here. */
export const STORE_COUNTRY = 'TR';