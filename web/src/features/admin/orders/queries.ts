import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/shared/api/ApiError';
import { errorMessage } from '@/shared/api/errorMessages';
import { toast } from '@/shared/ui/toast/toastStore';

import { useAdminSession } from '../session';

import { type AdminOrder, adminOrdersApi, type OrderListFilter } from './api';

export const adminOrderKeys = {
  all: ['admin', 'orders'] as const,
  list: (filter: OrderListFilter) => ['admin', 'orders', 'list', filter] as const,
  detail: (id: number) => ['admin', 'orders', 'detail', id] as const,
  documents: (id: number) => ['admin', 'orders', 'documents', id] as const,
};

export function useAdminOrders(filter: OrderListFilter) {
  const { status } = useAdminSession();
  return useQuery({
    queryKey: adminOrderKeys.list(filter),
    queryFn: ({ signal }) => adminOrdersApi.list(filter, signal),
    enabled: status === 'signedIn',
    placeholderData: keepPreviousData,
  });
}

export function useAdminOrder(id: number) {
  const { status } = useAdminSession();
  return useQuery({
    queryKey: adminOrderKeys.detail(id),
    queryFn: () => adminOrdersApi.get(id),
    enabled: status === 'signedIn' && id > 0,
  });
}

/**
 * Every order action returns the updated order: show it at once, then
 * refresh the lists and the dashboard (badge, counts). A 409 means someone
 * else changed the order first (API §10): reload it.
 */
export function useOrderAction<TVars>(
  id: number,
  action: (vars: TVars) => Promise<AdminOrder>,
  success: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: (order) => {
      queryClient.setQueryData(adminOrderKeys.detail(id), order);
      void queryClient.invalidateQueries({ queryKey: adminOrderKeys.all, refetchType: 'none' });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      toast.success(success);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: adminOrderKeys.detail(id) });
      }
      toast.error(errorMessage(error));
    },
  });
}
