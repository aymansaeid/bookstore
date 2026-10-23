import { paths } from '@/app/paths';
import type { IconName } from '@/shared/ui/Icon/icons';

export interface AdminNavItem {
  label: string;
  to: string;
  icon: IconName;
  /** Exact match only (the dashboard is the /admin index). */
  end?: boolean;
  /** Not built yet: shown, marked «قريباً». */
  soon?: boolean;
  badge?: 'awaitingShipment' | 'pendingReturns' | 'pendingReviews';
}

/** Spec 5.10 sidebar: four groups. */
export const ADMIN_NAV: readonly { title: string; items: AdminNavItem[] }[] = [
  {
    title: 'عام',
    items: [
      { label: 'لوحة المعلومات', to: paths.admin.root, icon: 'home', end: true },
      { label: 'رؤى أفندي', to: paths.admin.insights, icon: 'eye', soon: true },
    ],
  },
  {
    title: 'المتجر',
    items: [
      { label: 'الطلبات', to: paths.admin.orders, icon: 'box', badge: 'awaitingShipment' },
      { label: 'الإرجاعات', to: paths.admin.returns, icon: 'arrowr', badge: 'pendingReturns' },
      { label: 'الكتب والطبعات', to: paths.admin.books, icon: 'book' },
      { label: 'المخزون والتوريد', to: paths.admin.inventory, icon: 'sliders' },
      { label: 'الأقسام', to: paths.admin.categories, icon: 'menu' },
      { label: 'المحققون والمؤلفون', to: paths.admin.muhaqqiqs, icon: 'user' },
      { label: 'مسارات القراءة', to: paths.admin.readingPaths, icon: 'route' },
      { label: 'الكوبونات', to: paths.admin.coupons, icon: 'gift' },
    ],
  },
  {
    title: 'العملاء',
    items: [
     { label: 'العملاء', to: paths.admin.customers, icon: 'user', soon: true },
      { label: 'المراجعات', to: paths.admin.reviews, icon: 'check', badge: 'pendingReviews' },
    ],
  },
  {
    title: 'النظام',
    items: [
      { label: 'الشحن', to: paths.admin.shipping, icon: 'truck' },
      { label: 'الصفحات القانونية', to: paths.admin.legal, icon: 'shield' },
      { label: 'التقارير', to: paths.admin.reports, icon: 'arrow' },
      { label: 'سجل التدقيق', to: paths.admin.auditLog, icon: 'eye' },
      { label: 'حالة النظام', to: paths.admin.health, icon: 'heart' },
    ],
  },
];
