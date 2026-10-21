import type { ReturnReason, ReturnStatus } from '@/shared/api/enums';
import type { PagedResult } from '@/shared/api/types';

import { adminRequest } from '../session';

export type ItemCondition = 'Resellable' | 'Damaged';
export type ReturnAction = 'Approve' | 'Complete' | 'Reject';

/** API §10 AdminReturnSummaryDto. */
export interface AdminReturnSummary {
  id: number;
  orderNumber: string;
  customerEmail: string;
  status: ReturnStatus;
  itemCount: number;
  refundAmount: number;
  currency: string;
  isFullReturn: boolean;
  requestedAtUtc: string;
}

/** API §10 AdminReturnDto. */
export interface AdminReturn {
  id: number;
  orderId: number;
  orderNumber: string;
  customerEmail: string;
  status: ReturnStatus;
  reason: ReturnReason;
  customerComment: string | null;
  lines: {
    bookId: number;
    title: string;
    quantity: number;
    receivedCondition: ItemCondition | null;
  }[];
  refundAmount: number;
  currency: string;
  isFullReturn: boolean;
  refundReference: string | null;
  returnInstructions: string | null;
  /** Shown to the customer. */
  rejectionReason: string | null;
  handledByAdminId: number | null;
  requestedAtUtc: string;
  approvedAtUtc: string | null;
  rejectedAtUtc: string | null;
  completedAtUtc: string | null;
  cancelledAtUtc: string | null;
  allowedActions: ReturnAction[];
}

export const ADMIN_RETURNS_PAGE_SIZE = 20;

const BASE = '/api/admin/returns';
const one = (id: number) => `${BASE}/${String(id)}`;

export const adminReturnsApi = {
  /** Oldest first: work it as a queue. */
  list: (status: ReturnStatus | null, page: number, signal?: AbortSignal) =>
    adminRequest<PagedResult<AdminReturnSummary>>(BASE, {
      query: { status, page, pageSize: ADMIN_RETURNS_PAGE_SIZE },
      signal,
    }),
  get: (id: number) => adminRequest<AdminReturn>(one(id)),
  /** null instructions → the default return-address text from config. */
  approve: (id: number, instructions: string | null) =>
    adminRequest<AdminReturn>(`${one(id)}/approve`, { method: 'POST', body: { instructions } }),
  reject: (id: number, reason: string) =>
    adminRequest<AdminReturn>(`${one(id)}/reject`, { method: 'POST', body: { reason } }),
  /** The parcel arrived: one condition per returned book. Refunds immediately. */
  complete: (id: number, conditions: { bookId: number; condition: ItemCondition }[]) =>
    adminRequest<AdminReturn>(`${one(id)}/complete`, { method: 'POST', body: { conditions } }),
};
