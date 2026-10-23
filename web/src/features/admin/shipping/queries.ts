import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/shared/api/ApiError';
import { errorMessage } from '@/shared/api/errorMessages';
import { toast } from '@/shared/ui/toast/toastStore';

import { useAdminSession } from '../session';

import { adminShippingApi } from './api';

export const adminShippingKeys = {
  list: ['admin', 'shipping-zones'] as const,
};

export function useAdminZones() {
  const { status } = useAdminSession();
  return useQuery({
    queryKey: adminShippingKeys.list,
    queryFn: ({ signal }) => adminShippingApi.list(signal),
    enabled: status === 'signedIn',
  });
}

/** Zone changes also refresh the storefront's shipping rates and any open checkout quote. */
export function useZoneMutation<TVars, TResult>(
  action: (vars: TVars) => Promise<TResult>,
  success: string,
) {
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: adminShippingKeys.list });
    void queryClient.invalidateQueries({ queryKey: ['store'] });
    void queryClient.invalidateQueries({ queryKey: ['quote'] });
  };
  return useMutation({
    mutationFn: action,
    onSuccess: () => {
      refresh();
      toast.success(success);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) refresh();
      if (!(error instanceof ApiError && error.code === 'Validation')) {
        toast.error(errorMessage(error));
      }
    },
  });
}