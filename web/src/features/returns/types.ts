import type { ReturnReason, ReturnStatus } from '@/shared/api/enums';

/** API §9 ReturnEligibilityDto. */
export interface ReturnEligibility {
  canRequest: boolean;
  /** When canRequest is false: NotReturnable, WindowClosed or AlreadyRequested. */
  reason: 'NotReturnable' | 'WindowClosed' | 'AlreadyRequested' | null;
  deadline: string | null;
  lines: { bookId: number; title: string; purchasedQuantity: number }[];
}

/** API §9 PublicReturnDto. */
export interface PublicReturn {
  orderNumber: string;
  status: ReturnStatus;
  reason: ReturnReason;
  lines: { bookId: number; title: string; quantity: number; receivedCondition: string | null }[];
  refundAmount: number;
  currency: string;
  isFullReturn: boolean;
  /** Where to post the books; set once the store approves. */
  returnInstructions: string | null;
  /** Shown on purpose: a rejected return affects a legal right (§9). */
  rejectionReason: string | null;
  requestedAtUtc: string;
  completedAtUtc: string | null;
}

export interface ReturnRequestBody {
  items: { bookId: number; quantity: number }[];
  reason: ReturnReason;
  comment: string | null;
}
