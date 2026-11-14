import i18n from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LANGUAGE, ENABLED_LANGUAGES, UI_LANGUAGE } from '@/app/locale';

import arCommon from './locales/ar/common.json';
import enCommon from './locales/en/common.json';
import trCommon from './locales/tr/common.json';

/** Every namespace file except `common`, each its own chunk loaded on first use. */
const lazyNamespaces = import.meta.glob<{ default: Record<string, unknown> }>([
  './locales/*/*.json',
  '!./locales/*/common.json',
]);

/**
 * i18next setup. `common` (site name, language switcher, the "also in your
 * language" banner) ships in the main bundle for every language, because the
 * banner speaks the visitor's language, not the page's. Every other
 * namespace (one per area: catalog, book, cart…) is a JSON file loaded on
 * demand: locales/<lang>/<namespace>.json.
 *
 * Arabic is the source language and the fallback: a key missing in English
 * or Turkish shows the Arabic text, never the raw key.
 */
void i18n
  .use(
    resourcesToBackend(async (language: string, namespace: string) => {
      const load = lazyNamespaces[`./locales/${language}/${namespace}.json`];
      return load ? (await load()).default : {};
    }),
  )
  .use(initReactI18next)
  .init({
    lng: UI_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...ENABLED_LANGUAGES],
    ns: ['common'],
    defaultNS: 'common',
    resources: {
      ar: { common: arCommon },
      en: { common: enCommon },
      tr: { common: trCommon },
    },
    // The bundled `common` above plus the on-demand namespace files.
    partialBundledLanguages: true,
    // Synchronous with bundled resources, so the first render already has text.
    initAsync: false,
    // React escapes already.
    interpolation: { escapeValue: false },
    returnNull: false,
  });

export { i18n };