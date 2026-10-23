import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ReviewStatus } from '@/features/reviews/api';
import { ApiError } from '@/shared/api/ApiError';
import { errorMessage } from '@/shared/api/errorMessages';
import { toast } from '@/shared/ui/toast/toastStore';

import { useAdminSession } from '../session';

import { type AdminReview, adminReviewsApi } from './api';

export const adminReviewKeys = {
  all: ['admin', 'reviews'] as const,
  list: (status: ReviewStatus | null, bookId: number | null, page: number) =>
    ['admin', 'reviews', 'list', status, bookId, page] as const,
  /** The sidebar badge. */
  pendingCount: ['admin', 'reviews', 'pending-count'] as const,
};

export function useAdminReviews(status: ReviewStatus | null, bookId: number | null, page: number) {
  const { status: session } = useAdminSession();
  return useQuery({
    queryKey: adminReviewKeys.list(status, bookId, page),
    queryFn: ({ signal }) => adminReviewsApi.list(status, bookId, page, signal),
    enabled: session === 'signedIn',
    placeholderData: keepPreviousData,
  });
}

export function usePendingReviewsCount() {
  const { status } = useAdminSession();
  return useQuery({
    queryKey: adminReviewKeys.pendingCount,
    queryFn: async ({ signal }) =>
      (await adminReviewsApi.list('Pending', null, 1, signal)).totalCount,
    enabled: status === 'signedIn',
    staleTime: 60_000,
  });
}

/**
 * Approve or reject. The review leaves the filtered list, so lists and the
 * badge refresh; so do the book pages' public reviews and rating.
 */
export function useModerate<TVars>(action: (vars: TVars) => Promise<AdminReview>, success: string) {
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: adminReviewKeys.all });
    void queryClient.invalidateQueries({ queryKey: ['book'] });
  };
  return useMutation({
    mutationFn: action,
    onSuccess: () => {
      refresh();
      toast.success(success);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 404) refresh();
      if (!(error instanceof ApiError && error.code === 'Validation')) {
        toast.error(errorMessage(error));
      }
    },
  });
}