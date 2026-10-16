import type { PagedResult } from '@/shared/api/types';

/** API guide §4 BookReviewsDto. */
export interface ReviewSummary {
  averageRating: number | null;
  reviewCount: number;
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
}

export interface PublicReview {
  id: number;
  authorDisplayName: string;
  rating: number;
  title: string | null;
  body: string;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface BookReviewsResponse {
  summary: ReviewSummary;
  reviews: PagedResult<PublicReview>;
}

export type ReviewSort = 'Newest' | 'HighestRated' | 'LowestRated';

/** API guide §8. */
export interface ReviewEligibility {
  canReview: boolean;
  existingReviewId: number | null;
  reason: 'AlreadyReviewed' | 'NoEligiblePurchase' | null;
}

export interface SubmitReviewRequest {
  bookId: number;
  rating: number;
  title: string | null;
  body: string;
}
