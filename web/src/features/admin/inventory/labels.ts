import { formatCount } from '@/shared/lib/format';

import type { StockMovementReason } from './api';

export const REASON_LABELS: Readonly<Record<StockMovementReason, string>> = {
  OpeningBalance: 'رصيد افتتاحي',
  InitialStock: 'مخزون أولي',
  ManualAdjustment: 'تعديل بعد الجرد',
  Sale: 'بيع',
  CancellationRestock: 'عودة بعد إلغاء طلب',
  ReturnRestock: 'عودة بعد إرجاع',
};

/** Unknown future reasons show as sent rather than breaking the table. */
export const reasonLabel = (reason: string): string =>
  (REASON_LABELS as Readonly<Record<string, string>>)[reason] ?? reason;

/** +٣ / −٢ with a real minus sign; wrap in <bdi dir="ltr"> so the sign stays in front. */
export const signed = (delta: number): string =>
  delta > 0 ? `+${formatCount(delta)}` : delta < 0 ? `−${formatCount(-delta)}` : formatCount(0);