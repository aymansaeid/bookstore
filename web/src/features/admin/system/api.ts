import type { PagedResult } from '@/shared/api/types';

import { adminRequest } from '../session';

/** «Semicolon» suits Excel with Turkish regional settings (decimal comma). */
export type CsvDelimiter = 'Comma' | 'Semicolon';

/** API §10 AuditLogEntryDto: one admin change, written in the same transaction as the change. */
export interface AuditEntry {
  id: number;
  occurredAtUtc: string;
  adminUserId: number | null;
  actorName: string;
  /** The command's name without «Command», e.g. «ShipOrder». */
  action: string;
  entityType: string;
  entityId: string | null;
  /** The command's fields as JSON (secrets and long texts left out by the server). */
  detailsJson: string;
}

export type HealthStatus = 'Healthy' | 'Degraded' | 'Unhealthy';

export interface HealthEntry {
  name: string;
  status: HealthStatus;
  description: string | null;
  durationMs: number;
  data: Record<string, string | null>;
  /** The exception message only, never a stack trace. */
  error: string | null;
}

export interface HealthReport {
  status: HealthStatus;
  totalDurationMs: number;
  checks: HealthEntry[];
}

/** POST /catalog/images/regenerate. */
export interface ImageRegenerationResult {
  converted: number;
  /** Image rows whose file is missing from storage. */
  missing: number;
  failed: number;
}

/** CSV export limit (ExportOrdersCsvQueryValidator). */
export const MAX_EXPORT_DAYS = 366;
export const AUDIT_PAGE_SIZE = 50;

export const adminSystemApi = {
  /** Istanbul days, both inclusive. The export itself is written to the audit log. */
  exportOrders: (from: string, to: string, delimiter: CsvDelimiter) =>
    adminRequest<Blob>('/api/admin/reports/orders.csv', {
      query: { from, to, delimiter },
      responseType: 'blob',
    }),
  auditLog: (
    filter: { entityType: string | null; entityId: string | null; page: number },
    signal?: AbortSignal,
  ) =>
    adminRequest<PagedResult<AuditEntry>>('/api/admin/audit-log', {
      query: {
        entityType: filter.entityType,
        entityId: filter.entityId,
        page: filter.page,
        pageSize: AUDIT_PAGE_SIZE,
      },
      signal,
    }),
  health: (signal?: AbortSignal) => adminRequest<HealthReport>('/api/admin/health', { signal }),
  /** Returns how many books were reindexed. */
  reindexSearch: () => adminRequest<number>('/api/admin/catalog/reindex', { method: 'POST' }),
  /** Safe to re-run; converts images uploaded before WebP variants existed. */
  regenerateImages: () =>
    adminRequest<ImageRegenerationResult>('/api/admin/catalog/images/regenerate', {
      method: 'POST',
    }),
};

/** Saves a Blob as a file. The API's file name header isn't exposed cross-origin, so we name it. */
export function saveFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // Let the download start before the URL goes away.
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}