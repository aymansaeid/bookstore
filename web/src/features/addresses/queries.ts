import { useQuery } from '@tanstack/react-query';

import { useCustomerId } from '@/features/account/queries';

import { addressApi } from './api';

/** Under ['me', …], so sign-out removes them with the rest of the account cache. */
export const addressKeys = {
  list: (customerId: number) => ['me', 'addresses', customerId] as const,
};

export function useSavedAddresses() {
  const customerId = useCustomerId();
  return useQuery({
    queryKey: addressKeys.list(customerId ?? 0),
    queryFn: () => addressApi.list(),
    enabled: customerId !== null,
  });
}
