import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useCustomerId } from '@/features/account/queries';
import { customerRequest } from '@/features/auth/session';
import type { PublicMuhaqqiq } from '@/features/catalog/types';
import { errorMessage } from '@/shared/api/errorMessages';
import { toast } from '@/shared/ui/toast/toastStore';

/** API guide §7c. Follow and unfollow are idempotent (204). */
export interface FollowedMuhaqqiq {
  muhaqqiq: PublicMuhaqqiq;
  followedAtUtc: string;
}

const BASE = '/api/customers/me/follows/muhaqqiqs';

export const followsApi = {
  list: () => customerRequest<FollowedMuhaqqiq[]>(BASE),
  follow: (id: number) => customerRequest<undefined>(`${BASE}/${id}`, { method: 'PUT' }),
  unfollow: (id: number) => customerRequest<undefined>(`${BASE}/${id}`, { method: 'DELETE' }),
};

export const followKeys = {
  all: ['me', 'follows'] as const,
  list: (customerId: number) => ['me', 'follows', customerId] as const,
};

export function useFollowedIds(): ReadonlySet<number> {
  const customerId = useCustomerId();
  const { data } = useQuery({
    queryKey: followKeys.list(customerId ?? 0),
    queryFn: () => followsApi.list(),
    enabled: customerId !== null,
  });
  return useMemo(() => new Set(data?.map((item) => item.muhaqqiq.id)), [data]);
}

export function useToggleFollow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, following }: { id: number; following: boolean }) =>
      following ? followsApi.unfollow(id) : followsApi.follow(id),
    onSuccess: (_data, { following }) => {
      toast.success(
        following ? 'ألغيت متابعة المحقّق.' : 'تتابع هذا المحقّق الآن. سننبّهك بكل إصدار جديد.',
      );
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: followKeys.all });
    },
  });
}
