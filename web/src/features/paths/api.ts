import { customerRequest } from '@/features/auth/session';
import type { BookSummary } from '@/features/catalog/types';
import type { ReaderLevel } from '@/shared/api/enums';

/** API §7d (ReadingPathDtos). */
export interface PathPricing {
  totalPrice: number;
  discountPercentage: number;
  discountedPrice: number;
  savings: number;
  currency: string;
}

export interface ReadingPathSummary {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  level: ReaderLevel;
  estimatedWeeks: number;
  stageCount: number;
  isFeatured: boolean;
  isMostChosen: boolean;
  enrollmentCount: number;
  covers: {
    stageNumber: number;
    bookId: number;
    title: string;
    coverThumbnailUrl: string | null;
  }[];
  pricing: PathPricing;
}

export interface PathStage {
  stageNumber: number;
  reason: string;
  estimatedWeeks: number | null;
  book: BookSummary;
  pageCount: number;
  owned: boolean;
  finished: boolean;
  isCurrent: boolean;
}

export interface PathProgress {
  enrolled: boolean;
  startedAtUtc: string | null;
  completedStages: number;
  totalStages: number;
  percent: number;
  currentStageNumber: number | null;
  remainingPricing: PathPricing;
}

export interface MyReadingPath {
  summary: ReadingPathSummary;
  progress: PathProgress;
  nextStage: PathStage | null;
}

const BASE = '/api/customers/me/paths';

export const myPathsApi = {
  list: () => customerRequest<MyReadingPath[]>(BASE),
  start: (pathId: number) =>
    customerRequest<undefined>(`${BASE}/${String(pathId)}`, { method: 'PUT' }),
  leave: (pathId: number) =>
    customerRequest<undefined>(`${BASE}/${String(pathId)}`, { method: 'DELETE' }),
};
