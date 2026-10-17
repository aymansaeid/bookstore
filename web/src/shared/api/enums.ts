/** API enums (strings, API guide §2) with their Arabic labels. Unknown future values fall back safely. */
export type Tone = 'gray' | 'gold' | 'blue' | 'green' | 'red';

interface Labelled {
  label: string;
  tone: Tone;
}

function lookup<T extends string>(map: Readonly<Record<T, Labelled>>, value: string): Labelled {
  return (
    (map as Readonly<Record<string, Labelled | undefined>>)[value] ?? { label: value, tone: 'gray' }
  );
}

// API guide §6
export type OrderStatus =
  'PendingPayment' | 'Paid' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Expired' | 'Refunded';

const ORDER_STATUS: Readonly<Record<OrderStatus, Labelled>> = {
  PendingPayment: { label: 'بانتظار الدفع', tone: 'gray' },
  Paid: { label: 'قيد التجهيز', tone: 'gold' },
  Shipped: { label: 'تم الشحن', tone: 'blue' },
  Delivered: { label: 'تم التسليم', tone: 'green' },
  Cancelled: { label: 'ملغى', tone: 'red' },
  Expired: { label: 'انتهت مهلة الدفع', tone: 'gray' },
  Refunded: { label: 'مُسترد', tone: 'red' },
};
export const orderStatusInfo = (status: string): Labelled => lookup(ORDER_STATUS, status);

// API guide §9
export type ReturnStatus =
  'Requested' | 'Approved' | 'Completed' | 'Rejected' | 'CancelledByCustomer';

const RETURN_STATUS: Readonly<Record<ReturnStatus, Labelled>> = {
  Requested: { label: 'بانتظار الموافقة', tone: 'gold' },
  Approved: { label: 'تمت الموافقة', tone: 'blue' },
  Completed: { label: 'تم الاسترداد', tone: 'green' },
  Rejected: { label: 'مرفوض', tone: 'red' },
  CancelledByCustomer: { label: 'أُلغي', tone: 'gray' },
};
export const returnStatusInfo = (status: string): Labelled => lookup(RETURN_STATUS, status);

// API guide §4, §4c
export type BookFormat = 'Paperback' | 'Hardcover' | 'BoxSet';
export type ReaderLevel = 'Beginner' | 'Intermediate' | 'Specialist';
export type BookBadge = 'New' | 'Deluxe' | 'Bestseller';
export type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold';

const FORMAT: Readonly<Record<BookFormat, string>> = {
  Paperback: 'غلاف ورقي',
  Hardcover: 'مجلّد فاخر',
  BoxSet: 'مجموعة في علبة',
};
const LEVEL: Readonly<Record<ReaderLevel, string>> = {
  Beginner: 'مبتدئ',
  Intermediate: 'متوسط',
  Specialist: 'متخصص',
};
const BADGE: Readonly<Record<BookBadge, string>> = {
  New: 'جديد',
  Deluxe: 'طبعة فاخرة',
  Bestseller: 'الأكثر مبيعاً',
};
const TIER: Readonly<Record<LoyaltyTier, string>> = {
  Bronze: 'عضو برونزي',
  Silver: 'عضو فضي',
  Gold: 'عضو ذهبي',
};

const text = (map: Readonly<Record<string, string | undefined>>, value: string) =>
  map[value] ?? value;

export const formatLabel = (value: string): string => text(FORMAT, value);
export const levelLabel = (value: string): string => text(LEVEL, value);
export const badgeLabel = (value: string): string => text(BADGE, value);
export const tierLabel = (value: string): string => text(TIER, value);

// API guide §9 (returns) and §6 (customer cancellation)
export type ReturnReason = 'ChangedMind' | 'ArrivedDamaged' | 'WrongItem' | 'Other';
export const RETURN_REASONS: readonly ReturnReason[] = [
  'ChangedMind',
  'ArrivedDamaged',
  'WrongItem',
  'Other',
];
const RETURN_REASON: Readonly<Record<ReturnReason, string>> = {
  ChangedMind: 'غيّرت رأيي',
  ArrivedDamaged: 'وصل الكتاب تالفاً',
  WrongItem: 'وصلني كتاب غير الذي طلبته',
  Other: 'سبب آخر',
};
export const returnReasonLabel = (value: string): string => text(RETURN_REASON, value);

export type CancelReason =
  'ChangedMind' | 'OrderedByMistake' | 'FoundBetterPrice' | 'DeliveryTooSlow' | 'Other';
export const CANCEL_REASONS: readonly CancelReason[] = [
  'ChangedMind',
  'OrderedByMistake',
  'FoundBetterPrice',
  'DeliveryTooSlow',
  'Other',
];
const CANCEL_REASON: Readonly<Record<CancelReason, string>> = {
  ChangedMind: 'غيّرت رأيي',
  OrderedByMistake: 'طلبت بالخطأ',
  FoundBetterPrice: 'وجدت سعراً أفضل',
  DeliveryTooSlow: 'التوصيل بطيء',
  Other: 'سبب آخر',
};
export const cancelReasonLabel = (value: string): string => text(CANCEL_REASON, value);
