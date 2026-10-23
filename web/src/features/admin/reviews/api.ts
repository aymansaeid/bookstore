import type { ReviewStatus } from '@/features/reviews/api';
import type { PagedResult } from '@/shared/api/types';

import { adminRequest } from '../session';

/** API §10 AdminReviewDto. */
export interface AdminReview {
  id: number;
  bookId: number;
  bookTitle: string;
  customerId: number;
  /** As shown on the book page («أحمد م.»). */
  authorDisplayName: string;
  rating: number;
  title: string | null;
  body: string;
  status: ReviewStatus;
  /** Internal; the reader never sees it. */
  moderationNote: string | null;
  moderatedByAdminId: number | null;
  moderatedAtUtc: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export const MAX_REJECT_NOTE = 500;

const BASE = '/api/admin/reviews';

export const adminReviewsApi = {
  /** Pending comes oldest first: the moderation queue. */
  list: (
    status: ReviewStatus | null,
    bookId: number | null,
    page: number,
    signal?: AbortSignal,
  ) => {
    const query = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (status) query.set('status', status);
    if (bookId) query.set('bookId', String(bookId));
    return adminRequest<PagedResult<AdminReview>>(`${BASE}?${query.toString()}`, { signal });
  },
  /** Works from Pending or Rejected. */
  approve: (id: number) =>
    adminRequest<AdminReview>(`${BASE}/${String(id)}/approve`, { method: 'POST' }),
  /** Works from Pending or Approved (takes it off the book page). The note is required. */
  reject: (id: number, note: string) =>
    adminRequest<AdminReview>(`${BASE}/${String(id)}/reject`, { method: 'POST', body: { note } }),
};