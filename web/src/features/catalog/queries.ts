import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { catalogApi } from './api';
import type { CatalogSearchParams } from './types';

export const catalogKeys = {
  categories: ['catalog', 'categories'] as const,
  search: (params: CatalogSearchParams) => ['catalog', 'search', params] as const,
};

/** The category tree; top-level items are the roots of the array. */
export function useCategories() {
  return useQuery({
    queryKey: catalogKeys.categories,
    queryFn: () => catalogApi.categories(),
    staleTime: 10 * 60_000,
  });
}

/** GET /api/catalog/search. Keeps the previous page on screen while the next one loads. */
export function useCatalogSearch(params: CatalogSearchParams) {
  return useQuery({
    queryKey: catalogKeys.search(params),
    queryFn: ({ signal }) => catalogApi.search(params, signal),
    placeholderData: keepPreviousData,
  });
}
