import 'i18next';
import type arCatalog from './locales/ar/catalog.json';
import type arCommon from './locales/ar/common.json';
import type arHome from './locales/ar/home.json';

/**
 * Arabic is the source of truth for keys: t('…') is type-checked against the
 * Arabic files, so a misspelled or removed key fails the build. Add each new
 * namespace here as it's created.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      catalog: typeof arCatalog;
      common: typeof arCommon;
      home: typeof arHome;
    };
  }
}