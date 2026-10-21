import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/shared/api/ApiError';
import { errorMessage } from '@/shared/api/errorMessages';
import { toast } from '@/shared/ui/toast/toastStore';

import { useAdminSession } from '../session';

import { adminCatalogApi } from './api';

export const adminCatalogKeys = {
  categories: ['admin', 'categories'] as const,
  muhaqqiqs: ['admin', 'muhaqqiqs'] as const,
};

export function useAdminCategories() {
  const { status } = useAdminSession();
  return useQuery({
    queryKey: adminCatalogKeys.categories,
    queryFn: ({ signal }) => adminCatalogApi.categories(signal),
    enabled: status === 'signedIn',
    staleTime: 5 * 60_000,
  });
}

export function useAdminMuhaqqiqs() {
  const { status } = useAdminSession();
  return useQuery({
    queryKey: adminCatalogKeys.muhaqqiqs,
    queryFn: ({ signal }) => adminCatalogApi.muhaqqiqs(signal),
    enabled: status === 'signedIn',
    staleTime: 5 * 60_000,
  });
}

/**
 * Category and muhaqqiq changes: refresh the admin list and the storefront's
 * catalog caches (menus, category pages, featured muhaqqiqs). A 409 (in use,
 * has subcategories) also refreshes, since the counts were probably stale.
 */
export function useCatalogMutation<TVars, TResult>(
  kind: 'categories' | 'muhaqqiqs',
  action: (vars: TVars) => Promise<TResult>,
  success: string,
) {
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: adminCatalogKeys[kind] });
    void queryClient.invalidateQueries({ queryKey: ['catalog'] });
    void queryClient.invalidateQueries({ queryKey: ['muhaqqiqs'] });
  };
  return useMutation({
    mutationFn: action,
    onSuccess: () => {
      refresh();
      toast.success(success);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) refresh();
      if (!(error instanceof ApiError && error.code === 'Validation')) {
        toast.error(errorMessage(error));
      }
    },
  });
}