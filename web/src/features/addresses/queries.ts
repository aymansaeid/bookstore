import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useCustomerId } from '@/features/account/queries';

import { type AddressInput, addressApi, type SavedAddress } from './api';

/** Under ['me', …], so sign-out removes them with the rest of the account cache. */
export const addressKeys = {
  all: ['me', 'addresses'] as const,
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

/** Add / edit / delete / make default. Each reloads the list: the server decides the default. */
export function useAddressMutations() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: addressKeys.all });

  const save = useMutation({
    mutationFn: ({
      id,
      address,
      isDefault,
    }: {
      id: number | null;
      address: AddressInput;
      isDefault: boolean;
    }): Promise<SavedAddress> =>
      id === null ? addressApi.add(address, isDefault) : addressApi.update(id, address),
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: number) => addressApi.remove(id),
    onSettled: refresh,
  });
  const makeDefault = useMutation({
    mutationFn: (id: number) => addressApi.setDefault(id),
    onSettled: refresh,
  });

  return { save, remove, makeDefault };
}
