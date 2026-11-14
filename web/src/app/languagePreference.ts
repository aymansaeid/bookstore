import {
  DEFAULT_LANGUAGE,
  ENABLED_LANGUAGES,
  isUiLanguage,
  pathInLanguage,
  splitLanguage,
  type UiLanguage,
} from './locale';

const STORAGE_KEY = 'kitap-efendi:language';

/** The language the visitor picked in the switcher, if any. Storage can throw (private mode). */
export function readSavedLanguage(): UiLanguage | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return isUiLanguage(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveLanguage(language: UiLanguage): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Not remembered; the URL still carries the language.
  }
}

/**
 * Where to send the visitor before anything renders, or null to stay.
 * - /en/admin… → /admin…: the admin panel is Arabic only.
 * - /tr/… while Turkish isn't switched on → its Arabic page.
 * - A bare (Arabic) link, say from an email, for someone who chose English
 *   or Turkish in the switcher → the same page in their language.
 * First visits are never redirected by browser language: a suggestion
 * banner offers it instead, so search engines and shared links stay stable.
 */
export function startupRedirect(
  location: { pathname: string; search: string; hash: string },
  saved: UiLanguage | null,
): string | null {
  const { prefix, path } = splitLanguage(location.pathname);
  const tail = `${location.search}${location.hash}`;
  const isAdmin = path === '/admin' || path.startsWith('/admin/');

  if (prefix && (isAdmin || !ENABLED_LANGUAGES.includes(prefix))) return `${path}${tail}`;
  if (
    !prefix &&
    !isAdmin &&
    saved &&
    saved !== DEFAULT_LANGUAGE &&
    ENABLED_LANGUAGES.includes(saved)
  ) {
    return `${pathInLanguage(saved, path)}${tail}`;
  }
  return null;
}

/** The visitor's first browser language we support, if it isn't the page's. */
export function suggestedLanguage(current: UiLanguage): UiLanguage | null {
  if (typeof navigator === 'undefined') return null;
  for (const tag of navigator.languages) {
    const base = tag.toLowerCase().split('-')[0];
    if (isUiLanguage(base) && ENABLED_LANGUAGES.includes(base)) {
      return base === current ? null : base;
    }
  }
  return null;
}