import { useQuery } from '@tanstack/react-query';

import { useCustomerId } from '@/features/account/queries';
import { catalogApi } from '@/features/catalog/api';
import { readingPathsApi } from '@/features/paths/api';

import { homeApi } from './api';

/** Under ['me'], so sign-out removes them; the reading-profile save refreshes them. */
export function usePicks() {
  const customerId = useCustomerId();
  return useQuery({
    queryKey: ['me', 'recommendations', customerId ?? 0] as const,
    queryFn: () => homeApi.picks(),
    enabled: customerId !== null,
    staleTime: 5 * 60_000,
  });
}

export function useFeaturedPaths() {
  return useQuery({
    queryKey: ['reading-paths', 'featured'] as const,
    queryFn: () => readingPathsApi.list(true),
    staleTime: 5 * 60_000,
  });
}

export function useFeaturedMuhaqqiqs() {
  return useQuery({
    queryKey: ['muhaqqiqs', 'featured'] as const,
    queryFn: () => catalogApi.muhaqqiqs(true),
    staleTime: 10 * 60_000,
  });
}
