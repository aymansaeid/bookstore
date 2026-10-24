import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useAdminSession } from '../session';

import { adminSystemApi } from './api';

export const adminSystemKeys = {
  audit: (entityType: string | null, entityId: string | null, page: number) =>
    ['admin', 'audit-log', entityType, entityId, page] as const,
  health: ['admin', 'health'] as const,
};

export function useAuditLog(entityType: string | null, entityId: string | null, page: number) {
  const { status } = useAdminSession();
  return useQuery({
    queryKey: adminSystemKeys.audit(entityType, entityId, page),
    queryFn: ({ signal }) => adminSystemApi.auditLog({ entityType, entityId, page }, signal),
    enabled: status === 'signedIn',
    placeholderData: keepPreviousData,
  });
}

/** Re-checked every 30 seconds while the page is open. */
export function useHealth() {
  const { status } = useAdminSession();
  return useQuery({
    queryKey: adminSystemKeys.health,
    queryFn: ({ signal }) => adminSystemApi.health(signal),
    enabled: status === 'signedIn',
    refetchInterval: 30_000,
  });
}