import { DEFAULT_LANGUAGE, UI_DIRECTION, UI_LANGUAGE } from '@/app/locale';

/** Latin fonts with Turkish letters (ğ ş ı İ), loaded only for English and Turkish pages. */
const LATIN_FONTS =
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Serif:wght@400;600;700&display=swap';

/**
 * index.html ships lang="ar" dir="rtl" (the default, and what crawlers see
 * without JavaScript). English and Turkish pages switch them before the
 * first render, so the layout never flips after paint.
 */
export function applyDocumentLanguage(): void {
  const root = document.documentElement;
  root.lang = UI_LANGUAGE;
  root.dir = UI_DIRECTION;
  if (UI_LANGUAGE === DEFAULT_LANGUAGE) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = LATIN_FONTS;
  document.head.append(link);
}