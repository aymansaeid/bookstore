import { customerRequest } from '@/features/auth/session';
import type { PublicBook } from '@/features/catalog/types';
import { apiRequest } from '@/shared/api/http';

import type {
  BookReviewsResponse,
  ReviewEligibility,
  ReviewSort,
  SubmitReviewRequest,
} from './types';

export const bookApi = {
  /** Slugs are Arabic; the API accepts the encoded form (§4b). Hidden books are 404. */
  bySlug: (slug: string) => apiRequest<PublicBook>(`/api/books/${encodeURIComponent(slug)}`),
  reviews: (bookId: number, sort: ReviewSort, page: number) =>
    apiRequest<BookReviewsResponse>(`/api/books/${bookId}/reviews`, {
      query: { sort, page, pageSize: 10 },
    }),

  // Back-in-stock alerts (§8): no token, double opt-in by email.
  subscribeStock: (bookId: number, email: string) =>
    apiRequest<undefined>('/api/stock-notifications/subscribe', {
      method: 'POST',
      body: { bookId, email },
    }),
  confirmStock: (token: string) =>
    apiRequest<{ bookId: number; bookTitle: string }>('/api/stock-notifications/confirm', {
      method: 'POST',
      body: { token },
    }),
  unsubscribeStock: (token: string) =>
    apiRequest<undefined>('/api/stock-notifications/unsubscribe', {
      method: 'POST',
      body: { token },
    }),
};

export const reviewApi = {
  eligibility: (bookId: number) =>
    customerRequest<ReviewEligibility>(`/api/customers/me/reviews/eligibility/${bookId}`),
  submit: (body: SubmitReviewRequest) =>
    customerRequest<unknown>('/api/customers/me/reviews', { method: 'POST', body }),
};
