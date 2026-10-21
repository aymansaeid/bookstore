import type { PagedResult } from '@/shared/api/types';

import { adminRequest } from '../session';

export type StockMovementReason =
  | 'OpeningBalance'
  | 'InitialStock'
  | 'ManualAdjustment'
  | 'Sale'
  | 'CancellationRestock'
  | 'ReturnRestock';

/** One change to the physical stock. Positive = in, negative = out. */
export interface StockMovement {
  id: number;
  quantityDelta: number;
  reason: StockMovementReason;
  note: string | null;
  orderId: number | null;
  adminUserId: number | null;
  occurredAtUtc: string;
}

/** API §10 StockHistoryDto: newest movements first. */
export interface StockHistory {
  bookId: number;
  title: string;
  currentStock: number;
  /** Sum of every movement; equals currentStock when balanced. */
  ledgerTotal: number;
  isBalanced: boolean;
  movements: PagedResult<StockMovement>;
}

export interface ReconciliationRow {
  bookId: number;
  title: string;
  stockQuantity: number;
  ledgerTotal: number;
  /** stock − ledger: stock that appeared or vanished with no movement explaining it. */
  drift: number;
  isBalanced: boolean;
}

const BASE = '/api/admin/inventory';
const book = (id: number) => `${BASE}/books/${String(id)}`;

export const adminInventoryApi = {
  movements: (bookId: number, page: number, pageSize: number, signal?: AbortSignal) =>
    adminRequest<StockHistory>(
      `${book(bookId)}/movements?page=${String(page)}&pageSize=${String(pageSize)}`,
      { signal },
    ),
  /** Every book, unbalanced first. */
  reconciliation: (signal?: AbortSignal) =>
    adminRequest<ReconciliationRow[]>(`${BASE}/reconciliation`, { signal }),
  waitingList: (bookId: number, signal?: AbortSignal) =>
    adminRequest<{ bookId: number; waitingCount: number }>(`${book(bookId)}/waiting-list`, {
      signal,
    }),
  /** Runs the hourly low-stock scan now; returns how many books were alerted. */
  checkLowStock: () => adminRequest<number>(`${BASE}/low-stock/check`, { method: 'POST' }),
};