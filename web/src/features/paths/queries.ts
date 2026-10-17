import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useCustomerId } from '@/features/account/queries';
import { useSession } from '@/features/auth/session';
import { errorMessage } from '@/shared/api/errorMessages';
import { toast } from '@/shared/ui/toast/toastStore';

import { myPathsApi, readingPathsApi } from './api';

export const pathKeys = {
  all: ['reading-paths'] as const,
  list: ['reading-paths', 'list'] as const,
  /** The answer depends on who is asking (owned books, progress). */
  detail: (slug: string, customerId: number) =>
    ['reading-paths', 'detail', slug, customerId] as const,
};

export function useReadingPaths() {
  return useQuery({
    queryKey: pathKeys.list,
    queryFn: () => readingPathsApi.list(),
    staleTime: 60_000,
  });
}

export function useReadingPath(slug: string) {
  const { status } = useSession();
  const customerId = useCustomerId();
  return useQuery({
    queryKey: pathKeys.detail(slug, customerId ?? 0),
    queryFn: () => readingPathsApi.get(slug),
    // Wait until we know who is asking, or the page loads twice.
    enabled: slug !== '' && status !== 'unknown',
  });
}

/** Start or leave a path; refreshes the path page and «مساراتي». */
export function useEnrollment(pathId: number) {
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: pathKeys.all });
    void queryClient.invalidateQueries({ queryKey: ['me', 'paths'] });
  };
  const start = useMutation({
    mutationFn: () => myPathsApi.start(pathId),
    onSuccess: () => {
      toast.success('بدأت المسار. تقدّمك يُحسب من مكتبتك.');
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
    onSettled: refresh,
  });
  const leave = useMutation({
    mutationFn: () => myPathsApi.leave(pathId),
    onSuccess: () => {
      toast.success('تركت المسار. يمكنك العودة إليه متى شئت.');
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
    onSettled: refresh,
  });
  return { start, leave };
}
