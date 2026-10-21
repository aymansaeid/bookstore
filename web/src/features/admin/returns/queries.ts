import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/shared/api/ApiError';
import type { ReturnStatus } from '@/shared/api/enums';
import { errorMessage } from '@/shared/api/errorMessages';
import { toast } from '@/shared/ui/toast/toastStore';

import { useAdminSession } from '../session';

import { type AdminReturn, adminReturnsApi } from './api';

export const adminReturnKeys = {
  all: ['admin', 'returns'] as const,
  list: (status: ReturnStatus | null, page: number) =>
    ['admin', 'returns', 'list', status, page] as const,
  /** The sidebar badge: how many wait for a decision. */
  pendingCount: ['admin', 'returns', 'pending-count'] as const,
  detail: (id: number) => ['admin', 'returns', 'detail', id] as const,
};

export function useAdminReturns(status: ReturnStatus | null, page: number) {
  const { status: session } = useAdminSession();
  return useQuery({
    queryKey: adminReturnKeys.list(status, page),
    queryFn: ({ signal }) => adminReturnsApi.list(status, page, signal),
    enabled: session === 'signedIn',
    placeholderData: keepPreviousData,
  });
}

export function usePendingReturnsCount() {
  const { status } = useAdminSession();
  return useQuery({
    queryKey: adminReturnKeys.pendingCount,
    queryFn: async ({ signal }) => (await adminReturnsApi.list('Requested', 1, signal)).totalCount,
    enabled: status === 'signedIn',
    staleTime: 60_000,
  });
}

export function useAdminReturn(id: number) {
  const { status } = useAdminSession();
  return useQuery({
    queryKey: adminReturnKeys.detail(id),
    queryFn: () => adminReturnsApi.get(id),
    enabled: status === 'signedIn' && id > 0,
  });
}

/** Same pattern as orders: show the returned record, refresh lists, reload on 409. */
export function useReturnAction<TVars>(
  id: number,
  action: (vars: TVars) => Promise<AdminReturn>,
  success: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: (item) => {
      queryClient.setQueryData(adminReturnKeys.detail(id), item);
      void queryClient.invalidateQueries({ queryKey: adminReturnKeys.all, refetchType: 'none' });
      void queryClient.invalidateQueries({ queryKey: adminReturnKeys.pendingCount });
      // Completing a return refunds and may restock: orders and stock change too.
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      toast.success(success);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: adminReturnKeys.detail(id) });
      }
      toast.error(errorMessage(error));
    },
  });
}
