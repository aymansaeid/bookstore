import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useCustomerId } from '@/features/account/queries';

import { bookApi, reviewApi } from './api';
import type { ReviewSort, SubmitReviewRequest } from './types';

export const bookKeys = {
  detail: (slug: string) => ['book', slug] as const,
  reviews: (bookId: number, sort: ReviewSort) => ['book', bookId, 'reviews', sort] as const,
  eligibility: (customerId: number, bookId: number) =>
    ['me', 'review-eligibility', customerId, bookId] as const,
};

export function useBook(slug: string) {
  return useQuery({
    queryKey: bookKeys.detail(slug),
    queryFn: () => bookApi.bySlug(slug),
    enabled: slug !== '',
  });
}

export function useBookReviews(bookId: number, sort: ReviewSort) {
  return useInfiniteQuery({
    queryKey: bookKeys.reviews(bookId, sort),
    queryFn: ({ pageParam }) => bookApi.reviews(bookId, sort, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.reviews.hasNextPage ? last.reviews.page + 1 : undefined),
  });
}

export function useReviewEligibility(bookId: number) {
  const customerId = useCustomerId();
  return useQuery({
    queryKey: bookKeys.eligibility(customerId ?? 0, bookId),
    queryFn: () => reviewApi.eligibility(bookId),
    enabled: customerId !== null,
  });
}

export function useSubmitReview(bookId: number) {
  const queryClient = useQueryClient();
  const customerId = useCustomerId();
  return useMutation({
    mutationFn: (body: SubmitReviewRequest) => reviewApi.submit(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: bookKeys.eligibility(customerId ?? 0, bookId),
      });
    },
  });
}
