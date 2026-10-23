import type { ReviewStatus } from '@/features/reviews/api';
import type { Tone } from '@/shared/api/enums';

export const REVIEW_STATUS: Readonly<Record<ReviewStatus, { label: string; tone: Tone }>> = {
  Pending: { label: 'بانتظار المراجعة', tone: 'gold' },
  Approved: { label: 'منشورة', tone: 'green' },
  Rejected: { label: 'مرفوضة', tone: 'gray' },
};

/** The page opens on the queue: the work to do. */
export const REVIEW_FILTERS: readonly { status: ReviewStatus | null; label: string }[] = [
  { status: 'Pending', label: 'بانتظار المراجعة' },
  { status: 'Approved', label: 'منشورة' },
  { status: 'Rejected', label: 'مرفوضة' },
  { status: null, label: 'الكل' },
];

/** No ?status= means the queue; ?status=all means every review. */
export function reviewFilterFrom(value: string | null): ReviewStatus | null {
  if (value === 'all') return null;
  if (value === 'Approved' || value === 'Rejected') return value;
  return 'Pending';
}