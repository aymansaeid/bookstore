import { customerRequest } from '@/features/auth/session';

/** API §8 MyReviewDto. Every new or edited review waits for moderation. */
export type ReviewStatus = 'Pending' | 'Approved' | 'Rejected';

export interface MyReview {
  id: number;
  bookId: number;
  bookTitle: string;
  bookSlug: string;
  rating: number;
  title: string | null;
  body: string;
  status: ReviewStatus;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface ReviewUpdate {
  rating: number;
  title: string | null;
  body: string;
}

/** Review.MinBodyLength / MaxBodyLength / MaxTitleLength. */
export const REVIEW_LIMITS = { bodyMin: 10, bodyMax: 2000, titleMax: 120 } as const;

const BASE = '/api/customers/me/reviews';

export const myReviewsApi = {
  list: () => customerRequest<MyReview[]>(BASE),
  /** Editing an approved review sends it back to Pending. */
  update: (id: number, body: ReviewUpdate) =>
    customerRequest<MyReview>(`${BASE}/${String(id)}`, { method: 'PUT', body }),
  remove: (id: number) => customerRequest<undefined>(`${BASE}/${String(id)}`, { method: 'DELETE' }),
};
