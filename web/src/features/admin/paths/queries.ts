import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/shared/api/ApiError';
import { errorMessage } from '@/shared/api/errorMessages';
import { toast } from '@/shared/ui/toast/toastStore';

import { useAdminSession } from '../session';

import { adminPathsApi } from './api';

export const adminPathKeys = {
  list: ['admin', 'reading-paths'] as const,
};

export function useAdminPaths() {
  const { status } = useAdminSession();
  return useQuery({
    queryKey: adminPathKeys.list,
    queryFn: ({ signal }) => adminPathsApi.list(signal),
    enabled: status === 'signedIn',
  });
}

/** Path changes refresh the admin list, the public paths and readers' «مساراتي». */
export function usePathMutation<TVars, TResult>(
  action: (vars: TVars) => Promise<TResult>,
  success: string,
) {
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: adminPathKeys.list });
    void queryClient.invalidateQueries({ queryKey: ['reading-paths'] });
    void queryClient.invalidateQueries({ queryKey: ['me', 'paths'] });
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