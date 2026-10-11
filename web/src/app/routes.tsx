import type { ComponentType } from 'react';
import type { RouteObject } from 'react-router';

import { env } from '@/app/env';
import { paths } from '@/app/paths';
import { RouteErrorBoundary } from '@/app/RouteErrorBoundary';
import { RouteLoading } from '@/app/RouteLoading';
import RootLayout from '@/layouts/RootLayout';
import StorefrontLayout from '@/layouts/StorefrontLayout';
import NotFoundPage from '@/pages/not-found/NotFoundPage';

/**
 * Route tree. Every page and every layout except the storefront shell is
 * code-split, so a visitor downloads only the screen they open.
 *
 * Path segments must stay in sync with src/app/paths.ts; routes.test.ts
 * enforces this, plus every URL the backend links to (API guide §11).
 */

interface ComponentModule {
  default: ComponentType;
}

/** Adapts a default-exported component module to React Router's `lazy`. */
const lazyComponent = (load: () => Promise<ComponentModule>) => async () => ({
  Component: (await load()).default,
});

const storefrontRoutes: RouteObject[] = [
  { index: true, lazy: lazyComponent(() => import('@/pages/home/HomePage')) },

  // Catalog
  { path: 'search', lazy: lazyComponent(() => import('@/pages/catalog/SearchPage')) },
  { path: 'category/:slug', lazy: lazyComponent(() => import('@/pages/catalog/CategoryPage')) },
  { path: 'muhaqqiq/:slug', lazy: lazyComponent(() => import('@/pages/catalog/MuhaqqiqPage')) },
  { path: 'books/:slug', lazy: lazyComponent(() => import('@/pages/book/BookPage')) },

  // Reading paths and Ask Efendi
  { path: 'paths', lazy: lazyComponent(() => import('@/pages/paths/ReadingPathsPage')) },
  { path: 'paths/:slug', lazy: lazyComponent(() => import('@/pages/paths/ReadingPathPage')) },
  { path: 'ask', lazy: lazyComponent(() => import('@/pages/ask/AskEfendiPage')) },

  // Cart and checkout
  { path: 'cart', lazy: lazyComponent(() => import('@/pages/cart/CartPage')) },
  { path: 'checkout', lazy: lazyComponent(() => import('@/pages/checkout/CheckoutPage')) },
  {
    path: 'checkout/success',
    lazy: lazyComponent(() => import('@/pages/checkout/CheckoutSuccessPage')),
  },
  {
    path: 'checkout/cancel',
    lazy: lazyComponent(() => import('@/pages/checkout/CheckoutCancelPage')),
  },

  // Public order flows
  { path: 'track', lazy: lazyComponent(() => import('@/pages/orders/TrackOrderPage')) },
  { path: 'returns', lazy: lazyComponent(() => import('@/pages/orders/ReturnRequestPage')) },
  {
    path: 'notify-me/confirm',
    lazy: lazyComponent(() => import('@/pages/notify/NotifyConfirmPage')),
  },
  {
    path: 'notify-me/unsubscribe',
    lazy: lazyComponent(() => import('@/pages/notify/NotifyUnsubscribePage')),
  },
  { path: 'legal/:slug', lazy: lazyComponent(() => import('@/pages/legal/LegalPage')) },

  // Account
  {
    path: 'account',
    lazy: lazyComponent(() => import('@/layouts/AccountLayout')),
    children: [
      {
        index: true,
        lazy: lazyComponent(() => import('@/pages/account/AccountDashboardPage')),
      },
      { path: 'library', lazy: lazyComponent(() => import('@/pages/account/AccountLibraryPage')) },
      { path: 'paths', lazy: lazyComponent(() => import('@/pages/account/AccountPathsPage')) },
      { path: 'orders', lazy: lazyComponent(() => import('@/pages/account/AccountOrdersPage')) },
      {
        path: 'orders/:orderNumber',
        lazy: lazyComponent(() => import('@/pages/account/AccountOrderPage')),
      },
      {
        path: 'wishlist',
        lazy: lazyComponent(() => import('@/pages/account/AccountWishlistPage')),
      },
      {
        path: 'following',
        lazy: lazyComponent(() => import('@/pages/account/AccountFollowingPage')),
      },
      {
        path: 'notifications',
        lazy: lazyComponent(() => import('@/pages/account/AccountNotificationsPage')),
      },
      { path: 'chats', lazy: lazyComponent(() => import('@/pages/account/AccountChatsPage')) },
      { path: 'points', lazy: lazyComponent(() => import('@/pages/account/AccountPointsPage')) },
      {
        path: 'addresses',
        lazy: lazyComponent(() => import('@/pages/account/AccountAddressesPage')),
      },
      { path: 'reviews', lazy: lazyComponent(() => import('@/pages/account/AccountReviewsPage')) },
      {
        path: 'security',
        lazy: lazyComponent(() => import('@/pages/account/AccountSecurityPage')),
      },
    ],
  },

  { path: '*', Component: NotFoundPage },
];

const authRoutes: RouteObject[] = [
  { path: 'login', lazy: lazyComponent(() => import('@/pages/auth/LoginPage')) },
  { path: 'register', lazy: lazyComponent(() => import('@/pages/auth/RegisterPage')) },
  {
    path: 'forgot-password',
    lazy: lazyComponent(() => import('@/pages/auth/ForgotPasswordPage')),
  },
  { path: 'reset-password', lazy: lazyComponent(() => import('@/pages/auth/ResetPasswordPage')) },
  { path: 'verify-email', lazy: lazyComponent(() => import('@/pages/auth/VerifyEmailPage')) },
];

const adminRoutes: RouteObject[] = [
  { index: true, lazy: lazyComponent(() => import('@/pages/admin/AdminDashboardPage')) },
  { path: 'insights', lazy: lazyComponent(() => import('@/pages/admin/AdminInsightsPage')) },
  { path: 'orders', lazy: lazyComponent(() => import('@/pages/admin/AdminOrdersPage')) },
  { path: 'orders/:id', lazy: lazyComponent(() => import('@/pages/admin/AdminOrderPage')) },
  { path: 'returns', lazy: lazyComponent(() => import('@/pages/admin/AdminReturnsPage')) },
  { path: 'returns/:id', lazy: lazyComponent(() => import('@/pages/admin/AdminReturnPage')) },
  { path: 'books', lazy: lazyComponent(() => import('@/pages/admin/AdminBooksPage')) },
  // Static "new" outranks the dynamic ":id" segment, so both share the editor.
  { path: 'books/new', lazy: lazyComponent(() => import('@/pages/admin/AdminBookEditorPage')) },
  { path: 'books/:id', lazy: lazyComponent(() => import('@/pages/admin/AdminBookEditorPage')) },
  { path: 'inventory', lazy: lazyComponent(() => import('@/pages/admin/AdminInventoryPage')) },
  { path: 'categories', lazy: lazyComponent(() => import('@/pages/admin/AdminCategoriesPage')) },
  { path: 'muhaqqiqs', lazy: lazyComponent(() => import('@/pages/admin/AdminMuhaqqiqsPage')) },
  {
    path: 'reading-paths',
    lazy: lazyComponent(() => import('@/pages/admin/AdminReadingPathsPage')),
  },
  { path: 'coupons', lazy: lazyComponent(() => import('@/pages/admin/AdminCouponsPage')) },
  { path: 'shipping', lazy: lazyComponent(() => import('@/pages/admin/AdminShippingPage')) },
  { path: 'reviews', lazy: lazyComponent(() => import('@/pages/admin/AdminReviewsPage')) },
  { path: 'customers', lazy: lazyComponent(() => import('@/pages/admin/AdminCustomersPage')) },
  { path: 'legal', lazy: lazyComponent(() => import('@/pages/admin/AdminLegalPage')) },
  { path: 'reports', lazy: lazyComponent(() => import('@/pages/admin/AdminReportsPage')) },
  { path: 'audit-log', lazy: lazyComponent(() => import('@/pages/admin/AdminAuditLogPage')) },
  { path: 'health', lazy: lazyComponent(() => import('@/pages/admin/AdminHealthPage')) },
  {
    path: '*',
    element: <NotFoundPage backTo={paths.admin.root} backLabel="العودة إلى لوحة الإدارة" />,
  },
];

export const routes: RouteObject[] = [
  {
    id: 'root',
    Component: RootLayout,
    ErrorBoundary: RouteErrorBoundary,
    HydrateFallback: RouteLoading,
    children: [
      { id: 'storefront', Component: StorefrontLayout, children: storefrontRoutes },
      {
        id: 'auth',
        lazy: lazyComponent(() => import('@/layouts/AuthLayout')),
        children: authRoutes,
      },
      {
        id: 'bare',
        lazy: lazyComponent(() => import('@/layouts/BareLayout')),
        children: [
          // Outside the admin layout: it must render before an admin token exists.
          {
            path: 'admin/login',
            lazy: lazyComponent(() => import('@/pages/admin/AdminLoginPage')),
          },
          // Stand-in for the payment provider's hosted page, so no store chrome.
          ...(env.mockPaymentsEnabled
            ? [
                {
                  path: 'dev/mock-checkout',
                  lazy: lazyComponent(() => import('@/pages/dev/MockCheckoutPage')),
                },
              ]
            : []),
        ],
      },
      {
        id: 'admin',
        path: 'admin',
        lazy: lazyComponent(() => import('@/layouts/AdminLayout')),
        children: adminRoutes,
      },
    ],
  },
];
