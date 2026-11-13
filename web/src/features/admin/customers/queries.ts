import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/shared/api/ApiError';
import { errorMessage } from '@/shared/api/errorMessages';
import { toast } from '@/shared/ui/toast/toastStore';

import { useAdminSession } from '../session';

import { type AdminCustomer, adminCustomersApi, type CustomerListFilter } from './api';

export const adminCustomerKeys = {
  all: ['admin', 'customers'] as const,
  list: (filter: CustomerListFilter) => ['admin', 'customers', 'list', filter] as const,
  overview: ['admin', 'customers', 'overview'] as const,
  detail: (id: number) => ['admin', 'customers', 'detail', id] as const,
  points: (id: number, page: number) => ['admin', 'customers', 'points', id, page] as const,
};

export function useAdminCustomers(filter: CustomerListFilter) {
  const { status } = useAdminSession();
  return useQuery({
    queryKey: adminCustomerKeys.list(filter),
    queryFn: ({ signal }) => adminCustomersApi.list(filter, signal),
    enabled: status === 'signedIn',
    placeholderData: keepPreviousData,
  });
}

export function useCustomerOverview() {
  const { status } = useAdminSession();
  return useQuery({
    queryKey: adminCustomerKeys.overview,
    queryFn: adminCustomersApi.overview,
    enabled: status === 'signedIn',
  });
}

export function useAdminCustomer(id: number) {
  const { status } = useAdminSession();
  return useQuery({
    queryKey: adminCustomerKeys.detail(id),
    queryFn: () => adminCustomersApi.get(id),
    enabled: status === 'signedIn' && id > 0,
  });
}

export function usePointsHistory(id: number, page: number) {
  const { status } = useAdminSession();
  return useQuery({
    queryKey: adminCustomerKeys.points(id, page),
    queryFn: () => adminCustomersApi.pointsHistory(id, page),
    enabled: status === 'signedIn' && id > 0,
    placeholderData: keepPreviousData,
  });
}

/**
 * Account actions answer 204: reload the profile (status, sessions, allowed
 * actions) and mark the list and cards stale. A 404 or 409 means the account
 * changed under us (deleted by its owner, say): the reload shows why.
 */
export function useCustomerAction<TVars>(
  id: number,
  action: (vars: TVars) => Promise<unknown>,
  success: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminCustomerKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: adminCustomerKeys.all, refetchType: 'none' });
      toast.success(success);
    },
    onError: (error) => {
      if (error instanceof ApiError && (error.status === 404 || error.status === 409)) {
        void queryClient.invalidateQueries({ queryKey: adminCustomerKeys.detail(id) });
      }
      toast.error(errorMessage(error));
    },
  });
}

/** Returns the new balance: show it at once, then refresh the history and the list. */
export function useAdjustPoints(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { points: number; note: string; key: string }) =>
      adminCustomersApi.adjustPoints(id, vars.points, vars.note, vars.key),
    onSuccess: (loyalty) => {
      queryClient.setQueryData<AdminCustomer>(adminCustomerKeys.detail(id), (current) =>
        current ? { ...current, loyalty } : current,
      );
      void queryClient.invalidateQueries({ queryKey: ['admin', 'customers', 'points', id] });
      void queryClient.invalidateQueries({ queryKey: adminCustomerKeys.all, refetchType: 'none' });
    },
    onError: (error) => {
      // 409: the balance is too low, or the account was just deleted.
      if (error instanceof ApiError && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: adminCustomerKeys.detail(id) });
      }
      toast.error(errorMessage(error));
    },
  });
}