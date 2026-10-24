import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { PublicLegalType } from '@/features/legal/api';
import { ApiError } from '@/shared/api/ApiError';
import { errorMessage } from '@/shared/api/errorMessages';
import { toast } from '@/shared/ui/toast/toastStore';

import { useAdminSession } from '../session';

import { type AdminLegalDocument, adminLegalApi, type LegalLanguage } from './api';

export const adminLegalKeys = {
  all: ['admin', 'legal'] as const,
  list: (type: PublicLegalType, language: LegalLanguage) =>
    ['admin', 'legal', 'list', type, language] as const,
  placeholders: ['admin', 'legal', 'placeholders'] as const,
};

export function useLegalVersions(type: PublicLegalType, language: LegalLanguage) {
  const { status } = useAdminSession();
  return useQuery({
    queryKey: adminLegalKeys.list(type, language),
    queryFn: ({ signal }) => adminLegalApi.list(type, language, signal),
    enabled: status === 'signedIn',
  });
}

export function useLegalPlaceholders() {
  const { status } = useAdminSession();
  return useQuery({
    queryKey: adminLegalKeys.placeholders,
    queryFn: ({ signal }) => adminLegalApi.placeholders(signal),
    enabled: status === 'signedIn',
    staleTime: Infinity,
  });
}

/**
 * Save or publish. Publishing changes what buyers accept at checkout, so the
 * public pages, the checkout preview and the store config (terms version) refresh too.
 */
export function useLegalMutation<TVars>(
  action: (vars: TVars) => Promise<AdminLegalDocument>,
  success: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: (doc) => {
      // Show the saved version at once; the refetch then brings any archived one.
      queryClient.setQueryData<AdminLegalDocument[]>(
        adminLegalKeys.list(doc.type, doc.language),
        (old) => [...(old ?? []).filter((other) => other.id !== doc.id), doc],
      );
      void queryClient.invalidateQueries({ queryKey: adminLegalKeys.all });
      if (doc.status === 'Published') {
        void queryClient.invalidateQueries({ queryKey: ['legal'] });
        void queryClient.invalidateQueries({ queryKey: ['legal-preview'] });
        void queryClient.invalidateQueries({ queryKey: ['store'] });
      }
      toast.success(success);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: adminLegalKeys.all });
      }
      if (!(error instanceof ApiError && error.code === 'Validation')) {
        toast.error(errorMessage(error));
      }
    },
  });
}