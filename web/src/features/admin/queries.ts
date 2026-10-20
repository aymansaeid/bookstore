import { useQuery } from '@tanstack/react-query';

import { adminApi } from './api';
import { rangeOf } from './dates';
import { fetchAdminProfile, useAdminSession } from './session';

/** Everything admin is under ['admin', …]; the layout removes it on sign-out. */
export const adminKeys = {
  all: ['admin'] as const,
  me: ['admin', 'me'] as const,
  dashboard: (days: number, period: 'current' | 'previous') =>
    ['admin', 'dashboard', days, period] as const,
};

export function useAdminProfile() {
  const { status } = useAdminSession();
  return useQuery({
    queryKey: adminKeys.me,
    queryFn: () => fetchAdminProfile(),
    enabled: status === 'signedIn',
    staleTime: 5 * 60_000,
  });
}

/**
 * The dashboard for the last `days` days, or the same length just before
 * (for the KPI comparison). The range is worked out when the query runs, so
 * render stays pure and a page left open past midnight moves to the new day.
 */
export function useDashboard(days: number, period: 'current' | 'previous' = 'current') {
  const { status } = useAdminSession();
  return useQuery({
    queryKey: adminKeys.dashboard(days, period),
    queryFn: ({ signal }) => {
      const range = rangeOf(days)[period];
      return adminApi.dashboard(range.from, range.to, signal);
    },
    enabled: status === 'signedIn',
    staleTime: 60_000,
  });
}
