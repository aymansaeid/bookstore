import type { Tone } from '@/shared/api/enums';
import { arabicPlural, formatCount } from '@/shared/lib/format';

import type { CustomerSort, CustomerStatus } from './api';

export const CUSTOMER_FILTERS: readonly { status: CustomerStatus | null; label: string }[] = [
  { status: null, label: 'الكل' },
  { status: 'Active', label: 'نشطون' },
  { status: 'Unverified', label: 'لم يفعّلوا البريد' },
  { status: 'Inactive', label: 'موقوفون' },
  { status: 'Anonymized', label: 'حسابات محذوفة' },
];

export const CUSTOMER_SORTS: readonly { sort: CustomerSort; label: string }[] = [
  { sort: 'Newest', label: 'الأحدث تسجيلاً' },
  { sort: 'Oldest', label: 'الأقدم تسجيلاً' },
  { sort: 'TopSpenders', label: 'الأعلى إنفاقاً' },
  { sort: 'MostOrders', label: 'الأكثر طلبات' },
  { sort: 'RecentlyActive', label: 'آخر دخول' },
];

const STATUSES = new Set<string>(
  CUSTOMER_FILTERS.flatMap((item) => (item.status ? [item.status] : [])),
);
const SORTS = new Set<string>(CUSTOMER_SORTS.map((item) => item.sort));

export const isCustomerStatus = (value: string | null): value is CustomerStatus =>
  value !== null && STATUSES.has(value);

export const isCustomerSort = (value: string | null): value is CustomerSort =>
  value !== null && SORTS.has(value);

/** One badge per account, the most important state first. */
export function accountState(customer: {
  isAnonymized: boolean;
  isActive: boolean;
  isEmailVerified: boolean;
}): { label: string; tone: Tone } {
  if (customer.isAnonymized) return { label: 'حساب محذوف', tone: 'gray' };
  if (!customer.isActive) return { label: 'موقوف', tone: 'red' };
  if (!customer.isEmailVerified) return { label: 'لم يفعّل البريد', tone: 'gold' };
  return { label: 'نشط', tone: 'green' };
}

export const customersPhrase = (count: number): string =>
  count === 0
    ? 'لا عملاء'
    : arabicPlural(count, { one: 'عميل واحد', two: 'عميلان', few: 'عملاء', many: 'عميلاً' });

export const pointsPhrase = (count: number): string =>
  count === 0
    ? '٠ نقطة'
    : arabicPlural(count, { one: 'نقطة واحدة', two: 'نقطتان', few: 'نقاط', many: 'نقطة' });

export const devicesPhrase = (count: number): string =>
  arabicPlural(count, { one: 'جهاز واحد', two: 'جهازان', few: 'أجهزة', many: 'جهازاً' });

/** Signed: «+٥٠» / «−٢٠», for points history and confirmations. */
export const signedPoints = (points: number): string =>
  `${points > 0 ? '+' : '−'}${formatCount(Math.abs(points))}`;

export const POINTS_LIMIT = 100_000;
export const POINTS_NOTE_MAX = 300;