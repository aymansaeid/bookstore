import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { meKeys, useCustomerId } from '@/features/account/queries';
import { errorMessage } from '@/shared/api/errorMessages';
import { toast } from '@/shared/ui/toast/toastStore';

import { notificationsApi } from './api';

export const notificationKeys = {
  all: ['me', 'notifications'] as const,
  page: (customerId: number, page: number, unreadOnly: boolean) =>
    ['me', 'notifications', customerId, page, unreadOnly] as const,
};

export function useNotifications(page: number, unreadOnly: boolean) {
  const customerId = useCustomerId();
  return useQuery({
    queryKey: notificationKeys.page(customerId ?? 0, page, unreadOnly),
    queryFn: () => notificationsApi.list(page, unreadOnly),
    enabled: customerId !== null,
    placeholderData: keepPreviousData,
  });
}

/** Read state changes the list, the bell and the «لوحتي» summary. */
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    void queryClient.invalidateQueries({ queryKey: meKeys.unreadCountAll });
    void queryClient.invalidateQueries({ queryKey: [...meKeys.all, 'summary'] });
  };
  const one = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSettled: refresh,
  });
  const all = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onError: (error) => {
      toast.error(errorMessage(error));
    },
    onSettled: refresh,
  });
  return { one, all };
}
