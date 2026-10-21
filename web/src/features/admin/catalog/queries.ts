import { useQuery } from '@tanstack/react-query';

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