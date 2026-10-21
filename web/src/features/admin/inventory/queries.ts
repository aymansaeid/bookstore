import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';

import { errorMessage } from '@/shared/api/errorMessages';
import { formatCount } from '@/shared/lib/format';
import { toast } from '@/shared/ui/toast/toastStore';

import { useAdminSession } from '../session';

import { adminInventoryApi } from './api';

export const LEDGER_PAGE_SIZE = 20;

/** Book stock changes invalidate ['admin', 'inventory'] (books/queries.ts). */
export const adminInventoryKeys = {
  all: ['admin', 'inventory'] as const,
  ledger: (bookId: number, page: number) => ['admin', 'inventory', 'ledger', bookId, page] as const,
  reconciliation: ['admin', 'inventory', 'reconciliation'] as const,
  waiting: (bookId: number) => ['admin', 'inventory', 'waiting', bookId] as const,
};

export function useStockLedger(bookId: number, page: number) {
  const { status } = useAdminSession();
  return useQuery({
    queryKey: adminInventoryKeys.ledger(bookId, page),
    queryFn: ({ signal }) => adminInventoryApi.movements(bookId, page, LEDGER_PAGE_SIZE, signal),
    enabled: status === 'signedIn' && bookId > 0,
    placeholderData: keepPreviousData,
  });
}

export function useReconciliation() {
  const { status } = useAdminSession();
  return useQuery({
    queryKey: adminInventoryKeys.reconciliation,
    queryFn: ({ signal }) => adminInventoryApi.reconciliation(signal),
    enabled: status === 'signedIn',
  });
}

export function useWaitingList(bookId: number) {
  const { status } = useAdminSession();
  return useQuery({
    queryKey: adminInventoryKeys.waiting(bookId),
    queryFn: async ({ signal }) =>
      (await adminInventoryApi.waitingList(bookId, signal)).waitingCount,
    enabled: status === 'signedIn' && bookId > 0,
    staleTime: 60_000,
  });
}

export function useLowStockCheck() {
  return useMutation({
    mutationFn: () => adminInventoryApi.checkLowStock(),
    onSuccess: (count) => {
      toast.success(
        count === 0
          ? 'لا كتب تحتاج تنبيهاً جديداً الآن.'
          : `أُرسل بريد التنبيه. عدد الكتب فيه: ${formatCount(count)}.`,
      );
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}