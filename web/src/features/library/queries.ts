import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { meKeys, useCustomerId } from '@/features/account/queries';
import { errorMessage } from '@/shared/api/errorMessages';
import { toast } from '@/shared/ui/toast/toastStore';

import { libraryApi } from './api';

export const libraryKeys = {
  all: ['me', 'library'] as const,
  detail: (customerId: number) => ['me', 'library', customerId] as const,
};

export function useLibrary() {
  const customerId = useCustomerId();
  return useQuery({
    queryKey: libraryKeys.detail(customerId ?? 0),
    queryFn: () => libraryApi.get(),
    enabled: customerId !== null,
  });
}

export function useToggleOwned() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookId, owned }: { bookId: number; owned: boolean }) =>
      owned ? libraryApi.unmarkOwned(bookId) : libraryApi.markOwned(bookId),
    onError: (error) => {
      toast.error(errorMessage(error));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: libraryKeys.all });
      void queryClient.invalidateQueries({ queryKey: [...meKeys.all, 'summary'] });
    },
  });
}
