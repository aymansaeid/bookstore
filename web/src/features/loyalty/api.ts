import { customerRequest } from '@/features/auth/session';
import type { LoyaltyTier } from '@/shared/api/enums';
import type { PagedResult } from '@/shared/api/types';

/** API §7e LoyaltySummaryDto. */
export interface LoyaltySummary {
  enabled: boolean;
  balance: number;
  /** Earned on orders that can still be returned; confirmed later. */
  pendingPoints: number;
  tier: LoyaltyTier;
  earnedLast12Months: number;
  nextTier: { tier: LoyaltyTier; pointsNeeded: number } | null;
  /** What one point is worth, in the store currency. */
  currencyPerPoint: number;
}

export type LoyaltyTransactionType =
  'Earned' | 'ReturnClawback' | 'Redeemed' | 'RedemptionReversed' | 'Adjustment';

export interface LoyaltyTransaction {
  id: number;
  type: LoyaltyTransactionType;
  points: number;
  orderNumber: string | null;
  note: string | null;
  createdAtUtc: string;
}

export const TRANSACTION_LABELS: Readonly<Record<LoyaltyTransactionType, string>> = {
  Earned: 'نقاط مكتسبة من طلب',
  ReturnClawback: 'خُصمت بسبب إرجاع',
  Redeemed: 'استُخدمت في طلب',
  RedemptionReversed: 'أُعيدت بعد إلغاء طلب',
  Adjustment: 'تعديل من المتجر',
};

export const LOYALTY_PAGE_SIZE = 20;

export const loyaltyApi = {
  summary: () => customerRequest<LoyaltySummary>('/api/customers/me/loyalty'),
  history: (page: number) =>
    customerRequest<PagedResult<LoyaltyTransaction>>('/api/customers/me/loyalty/history', {
      query: { page, pageSize: LOYALTY_PAGE_SIZE },
    }),
};
