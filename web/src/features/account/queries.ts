import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/session';

import { accountApi } from './api';

/** Everything customer-specific lives under ['me', …] and is removed on sign-out. */
export const meKeys = {
  all: ['me'] as const,
  summary: (customerId: number) => ['me', 'summary', customerId] as const,
  unreadCountAll: ['me', 'unread-count'] as const,
  unreadCount: (customerId: number) => ['me', 'unread-count', customerId] as const,
};

function useCustomerId(): number | null {
  const { status, customer } = useSession();
  return status === 'authenticated' && customer ? customer.id : null;
}

export function useCustomerSummary() {
  const customerId = useCustomerId();
  return useQuery({
    queryKey: meKeys.summary(customerId ?? 0),
    queryFn: ({ signal }) => accountApi.summary(signal),
    enabled: customerId !== null,
  });
}

/**
 * Header bell (API guide §7c): poll about once a minute while the tab is
 * visible; TanStack pauses the interval for hidden tabs.
 */
export function useUnreadNotificationsCount() {
  const customerId = useCustomerId();
  return useQuery({
    queryKey: meKeys.unreadCount(customerId ?? 0),
    queryFn: ({ signal }) => accountApi.unreadNotificationsCount(signal),
    enabled: customerId !== null,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
