/**
 * The single source of truth for building in-app URLs. Never hand-write a
 * path string in a component: import from here.
 *
 * Slugs are Arabic (e.g. «زاد-المعاد»), so dynamic segments are encoded.
 * React Router decodes them again in useParams().
 *
 * Routes marked [backend] are linked from emails or payment redirects
 * (API guide §11) and must never change.
 */
const seg = (value: string | number): string => encodeURIComponent(String(value));

export const paths = {
  home: '/',

  // Catalog (spec 5.3, 5.4)
  search: '/search',
  category: (slug: string) => `/category/${seg(slug)}`,
  muhaqqiq: (slug: string) => `/muhaqqiq/${seg(slug)}`,
  book: (slug: string) => `/books/${seg(slug)}`, // [backend]

  // Reading paths (spec 5.5) and Ask Efendi (spec 5.2)
  readingPaths: '/paths',
  readingPath: (slug: string) => `/paths/${seg(slug)}`,
  askEfendi: '/ask',

  // Cart and checkout (spec 5.6, 5.7; API §5)
  cart: '/cart',
  checkout: '/checkout',
  checkoutSuccess: '/checkout/success', // [backend] Payments:SuccessPath
  checkoutCancel: '/checkout/cancel', // [backend] Payments:CancelPath
  mockCheckout: '/dev/mock-checkout', // [backend] Development only

  // Public order flows (API §6, §8, §9)
  trackOrder: '/track', // [backend]
  returns: '/returns',
  notifyConfirm: '/notify-me/confirm', // [backend]
  notifyUnsubscribe: '/notify-me/unsubscribe', // [backend]
  legal: (slug: string) => `/legal/${seg(slug)}`,

  // Auth (spec 5.8; API §7)
  login: '/login', // [backend]
  register: '/register',
  forgotPassword: '/forgot-password', // [backend]
  resetPassword: '/reset-password', // [backend]
  verifyEmail: '/verify-email', // [backend]

  // Account (spec 5.9)
  account: {
    root: '/account',
    library: '/account/library',
    paths: '/account/paths',
    orders: '/account/orders',
    order: (orderNumber: string) => `/account/orders/${seg(orderNumber)}`,
    wishlist: '/account/wishlist',
    following: '/account/following',
    notifications: '/account/notifications',
    chats: '/account/chats',
    points: '/account/points',
    addresses: '/account/addresses',
    reviews: '/account/reviews',
    security: '/account/security',
  },

  // Admin (spec 5.10; API §10). Store:AdminBaseUrl points at /admin.
  admin: {
    login: '/admin/login',
    root: '/admin',
    insights: '/admin/insights',
    orders: '/admin/orders',
    order: (id: number) => `/admin/orders/${seg(id)}`,
    returns: '/admin/returns', // [backend]
    return: (id: number) => `/admin/returns/${seg(id)}`,
    books: '/admin/books',
    newBook: '/admin/books/new',
    book: (id: number) => `/admin/books/${seg(id)}`,
    inventory: '/admin/inventory', // [backend]
    categories: '/admin/categories',
    muhaqqiqs: '/admin/muhaqqiqs',
    readingPaths: '/admin/reading-paths',
    coupons: '/admin/coupons',
    shipping: '/admin/shipping',
    reviews: '/admin/reviews',
    customers: '/admin/customers',
    legal: '/admin/legal',
    reports: '/admin/reports',
    auditLog: '/admin/audit-log',
    health: '/admin/health',
  },
} as const;
