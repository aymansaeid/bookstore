import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/shared/api/ApiError';
import { errorMessage } from '@/shared/api/errorMessages';
import { toast } from '@/shared/ui/toast/toastStore';

import { useAdminSession } from '../session';

import { adminCouponsApi } from './api';

export const adminCouponKeys = {
  list: ['admin', 'coupons'] as const,
};

export function useAdminCoupons() {
  const { status } = useAdminSession();
  return useQuery({
    queryKey: adminCouponKeys.list,
    queryFn: ({ signal }) => adminCouponsApi.list(signal),
    enabled: status === 'signedIn',
  });
}

export function useCouponMutation<TVars, TResult>(
  action: (vars: TVars) => Promise<TResult>,
  success: string,
) {
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: adminCouponKeys.list });
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