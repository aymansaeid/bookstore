import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/shared/api/ApiError';
import { errorMessage } from '@/shared/api/errorMessages';
import { toast } from '@/shared/ui/toast/toastStore';

import { useAdminSession } from '../session';

import { type AdminBook, adminBooksApi } from './api';

export const adminBookKeys = {
  all: ['admin', 'books'] as const,
  list: ['admin', 'books', 'list'] as const,
  detail: (id: number) => ['admin', 'books', 'detail', id] as const,
};

export function useAdminBooks() {
  const { status } = useAdminSession();
  return useQuery({
    queryKey: adminBookKeys.list,
    queryFn: ({ signal }) => adminBooksApi.list(signal),
    enabled: status === 'signedIn',
  });
}

export function useAdminBook(id: number) {
  const { status } = useAdminSession();
  return useQuery({
    queryKey: adminBookKeys.detail(id),
    queryFn: () => adminBooksApi.get(id),
    enabled: status === 'signedIn' && id > 0,
  });
}

/**
 * Book changes. Calls that return the book update the page at once; the
 * others (images, visibility) reload it. Either way the list, the dashboard
 * (low stock) and the public catalog caches refresh.
 */
export function useBookMutation<TVars>(
  id: number,
  action: (vars: TVars) => Promise<AdminBook | undefined>,
  success: string | null,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: (result) => {
      if (result) {
        queryClient.setQueryData(adminBookKeys.detail(id), result);
      } else {
        void queryClient.invalidateQueries({ queryKey: adminBookKeys.detail(id) });
      }
      void queryClient.invalidateQueries({ queryKey: adminBookKeys.list });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      // The storefront's own caches for this book and the catalog.
      void queryClient.invalidateQueries({ queryKey: ['book'] });
      void queryClient.invalidateQueries({ queryKey: ['catalog'] });
      if (success) toast.success(success);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: adminBookKeys.detail(id) });
      }
      if (!(error instanceof ApiError && error.code === 'Validation')) {
        toast.error(errorMessage(error));
      }
    },
  });
}