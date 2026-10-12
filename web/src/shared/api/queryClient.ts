import { QueryClient } from '@tanstack/react-query';

import { ApiError } from './ApiError';

/**
 * Retry network failures and 5xx up to twice. Never retry 4xx: a 409, 404 or
 * 429 won't fix itself, and retrying 429 makes rate limiting worse.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
      },
      mutations: { retry: false },
    },
  });
}
