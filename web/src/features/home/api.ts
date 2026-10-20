import { customerRequest } from '@/features/auth/session';
import type { BookSummary } from '@/features/catalog/types';

/** API §7d personalised picks («اقتراحات اليوم»). */
export type PickReasonType = 'BecauseYouBought' | 'FollowsMuhaqqiq' | 'MatchesInterest' | 'Popular';

export interface PickReason {
  type: PickReasonType;
  refId: number | null;
  refSlug: string | null;
  label: string | null;
}

export interface Pick {
  book: BookSummary;
  /** 50–98, a ranking signal; null for Popular fallbacks (show no percentage). */
  matchPercent: number | null;
  reasons: PickReason[];
}

export interface Picks {
  items: Pick[];
  /** Up to two: the pills above the row. */
  headlineReasons: PickReason[];
}

export const PICKS_LIMIT = 6;

export const homeApi = {
  picks: () =>
    customerRequest<Picks>('/api/customers/me/recommendations', {
      query: { limit: PICKS_LIMIT },
    }),
};
