import type { ReturnStatus } from '@/shared/api/enums';

/** The queue opens on «بانتظار الموافقة»: the work to do. */
export const RETURN_FILTERS: readonly { status: ReturnStatus | null; label: string }[] = [
  { status: 'Requested', label: 'بانتظار الموافقة' },
  { status: 'Approved', label: 'بانتظار وصول الطرد' },
  { status: 'Completed', label: 'مُستردّة' },
  { status: 'Rejected', label: 'مرفوضة' },
  { status: 'CancelledByCustomer', label: 'ألغاها العميل' },
  { status: null, label: 'الكل' },
];

const STATUSES = new Set<string>(
  RETURN_FILTERS.flatMap((item) => (item.status ? [item.status] : [])),
);

/** No ?status= means the default queue; ?status=all means every return. */
export function returnFilterFrom(value: string | null): ReturnStatus | null {
  if (value === 'all') return null;
  if (value !== null && STATUSES.has(value)) return value as ReturnStatus;
  return 'Requested';
}

export const CONDITION_LABELS = {
  Resellable: 'سليم، يعود إلى المخزون',
  Damaged: 'تالف، لا يعود إلى المخزون',
} as const;
