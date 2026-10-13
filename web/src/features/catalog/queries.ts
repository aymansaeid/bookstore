import { useQuery } from '@tanstack/react-query';

import { catalogApi } from './api';

export const catalogKeys = {
  categories: ['catalog', 'categories'] as const,
};

/** The category tree; top-level items are the roots of the array. */
export function useCategories() {
  return useQuery({
    queryKey: catalogKeys.categories,
    queryFn: () => catalogApi.categories(),
    staleTime: 10 * 60_000,
  });
}
