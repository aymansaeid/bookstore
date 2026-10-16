import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { catalogApi } from './api';
import type { CatalogSearchParams } from './types';

export const catalogKeys = {
  categories: ['catalog', 'categories'] as const,
  category: (slug: string) => ['catalog', 'category', slug] as const,
  muhaqqiq: (slug: string) => ['catalog', 'muhaqqiq', slug] as const,
  search: (params: CatalogSearchParams) => ['catalog', 'search', params] as const,
  facets: (params: CatalogSearchParams) => ['catalog', 'facets', params] as const,
};

/** The category tree; top-level items are the roots of the array. */
export function useCategories() {
  return useQuery({
    queryKey: catalogKeys.categories,
    queryFn: () => catalogApi.categories(),
    staleTime: 10 * 60_000,
  });
}

export function useCategory(slug: string) {
  return useQuery({
    queryKey: catalogKeys.category(slug),
    queryFn: () => catalogApi.category(slug),
    enabled: slug !== '',
    staleTime: 10 * 60_000,
  });
}

export function useMuhaqqiq(slug: string) {
  return useQuery({
    queryKey: catalogKeys.muhaqqiq(slug),
    queryFn: () => catalogApi.muhaqqiq(slug),
    enabled: slug !== '',
    staleTime: 10 * 60_000,
  });
}

/**
 * Results. The signal is used here on purpose: when filters change quickly,
 * the stale request is cancelled. Previous results stay on screen meanwhile.
 */
export function useCatalogSearch(params: CatalogSearchParams) {
  return useQuery({
    queryKey: catalogKeys.search(params),
    queryFn: ({ signal }) => catalogApi.search(params, signal),
    placeholderData: keepPreviousData,
  });
}

/**
 * Sidebar counts (API §4d: request facets when filters change, not on every
 * page turn). Page and sort never reach this key, so paging doesn't refetch it.
 */
export function useCatalogFacets(filters: CatalogSearchParams) {
  const params: CatalogSearchParams = {
    ...filters,
    page: undefined,
    sort: undefined,
    pageSize: 1,
    facets: true,
  };
  return useQuery({
    queryKey: catalogKeys.facets(params),
    queryFn: ({ signal }) => catalogApi.search(params, signal),
    select: (data) => data.facets,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });
}
