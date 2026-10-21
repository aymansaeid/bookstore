import { PICKUP_METHOD } from '@/features/checkout/shipping';
import type { OrderStatus } from '@/shared/api/enums';
import { arabicPlural } from '@/shared/lib/format';

/** Admin wording: «قيد التجهيز» for customers is «بانتظار الشحن» for the store. */
export const ORDER_FILTERS: readonly { status: OrderStatus | null; label: string }[] = [
  { status: null, label: 'الكل' },
  { status: 'Paid', label: 'بانتظار الشحن' },
  { status: 'Shipped', label: 'مشحونة' },
  { status: 'Delivered', label: 'مُسلَّمة' },
  { status: 'PendingPayment', label: 'بانتظار الدفع' },
  { status: 'Cancelled', label: 'ملغاة' },
  { status: 'Refunded', label: 'مُستردّة' },
  { status: 'Expired', label: 'انتهت مهلتها' },
];

const STATUSES = new Set<string>(
  ORDER_FILTERS.flatMap((item) => (item.status ? [item.status] : [])),
);

export const isOrderStatus = (value: string | null): value is OrderStatus =>
  value !== null && STATUSES.has(value);

/** Common Turkish and international carriers, offered as suggestions only. */
export const CARRIERS = [
  'Yurtiçi Kargo',
  'Aras Kargo',
  'MNG Kargo',
  'PTT Kargo',
  'Sürat Kargo',
  'DHL',
  'UPS',
  'FedEx',
];

export const ordersPhrase = (count: number): string =>
  arabicPlural(count, { one: 'طلب واحد', two: 'طلبان', few: 'طلبات', many: 'طلباً' });

/** The order stores the method's code and name; same wording as checkout. */
export function shippingMethodLabel(code: string, name: string | null): string {
  if (name) return name;
  if (code === 'standard') return 'الشحن العادي';
  if (code === PICKUP_METHOD) return 'الاستلام من المكتبة';
  return code;
}
