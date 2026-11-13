import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useAdminSession } from '../session';

import { adminSearchApi, SEARCH_MIN_LENGTH } from './api';

/**
 * ⌘K results, only while the box is open. Anything under 2 characters is the
 * same request (quick views), so it shares one cache entry.
 */
export function useAdminSearch(term: string, open: boolean) {
  const { status } = useAdminSession();
  const q = term.trim().length < SEARCH_MIN_LENGTH ? '' : term.trim();
  return useQuery({
    queryKey: ['admin', 'search', q] as const,
    queryFn: ({ signal }) => adminSearchApi.search(q, signal),
    enabled: status === 'signedIn' && open,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}