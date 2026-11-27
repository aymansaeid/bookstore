import 'i18next';

import type arAuth from './locales/ar/auth.json';
import type arBook from './locales/ar/book.json';
import type arCheckout from './locales/ar/checkout.json';
import type arCatalog from './locales/ar/catalog.json';
import type arCommon from './locales/ar/common.json';
import type arHome from './locales/ar/home.json';
import type arOrders from './locales/ar/orders.json';
import type arAccount from './locales/ar/account.json';
import type arPaths from './locales/ar/paths.json';
import type arEfendi from './locales/ar/efendi.json';

/**
 * Arabic is the source of truth for keys: t('…') is type-checked against the
 * Arabic files, so a misspelled or removed key fails the build. Add each new
 * namespace here as it's created.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      account: typeof arAccount;
      auth: typeof arAuth;
      book: typeof arBook;
      catalog: typeof arCatalog;
      checkout: typeof arCheckout;
      common: typeof arCommon;
      efendi: typeof arEfendi;
      home: typeof arHome;
      orders: typeof arOrders;
      paths: typeof arPaths;
    };
  }
}