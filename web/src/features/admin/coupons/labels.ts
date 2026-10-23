import type { Tone } from '@/shared/api/enums';
import { arabicPlural, formatCount } from '@/shared/lib/format';

import type { AdminCoupon, CouponStatus } from './api';

export const COUPON_STATUS: Readonly<Record<CouponStatus, { label: string; tone: Tone }>> = {
  Active: { label: 'فعّال', tone: 'green' },
  Expired: { label: 'منتهٍ', tone: 'gray' },
  Exhausted: { label: 'استُنفد', tone: 'gold' },
  Inactive: { label: 'موقوف', tone: 'gray' },
};

export const COUPON_FILTERS: { id: CouponStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'Active', label: 'فعّالة' },
  { id: 'Expired', label: 'منتهية' },
  { id: 'Exhausted', label: 'مستنفدة' },
  { id: 'Inactive', label: 'موقوفة' },
];

export const timesPhrase = (count: number): string =>
  count === 0
    ? 'لم يُستخدم'
    : arabicPlural(count, { one: 'مرة واحدة', two: 'مرتين', few: 'مرات', many: 'مرة' });

/** «٣ من ١٠» or «٣، بلا حد». */
export const usageText = (coupon: AdminCoupon): string =>
  coupon.maxRedemptions === null
    ? `${formatCount(coupon.timesRedeemed)}، بلا حد`
    : `${formatCount(coupon.timesRedeemed)} من ${formatCount(coupon.maxRedemptions)}`;