import { customerRequest, optionalCustomerRequest } from '@/features/auth/session';
import type { BookSummary } from '@/features/catalog/types';
import type { ReaderLevel } from '@/shared/api/enums';
import { apiRequest } from '@/shared/api/http';

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

/** The path page (spec 5.5). myProgress is null for guests. */
export interface ReadingPathDetail {
  summary: ReadingPathSummary;
  stages: PathStage[];
  myProgress: PathProgress | null;
}

export interface MyReadingPath {
  summary: ReadingPathSummary;
  progress: PathProgress;
  nextStage: PathStage | null;
}

export const readingPathsApi = {
  /** featured: the home page's three cards; otherwise every path. */
  list: (featured?: boolean) =>
    apiRequest<ReadingPathSummary[]>('/api/reading-paths', {
      query: { featured: featured === true ? true : undefined },
    }),
  /** With a customer token: owned books, progress and the remaining price. */
  get: (slug: string) =>
    optionalCustomerRequest<ReadingPathDetail>(`/api/reading-paths/${encodeURIComponent(slug)}`),
};

const BASE = '/api/customers/me/paths';

export const myPathsApi = {
  list: () => customerRequest<MyReadingPath[]>(BASE),
  start: (pathId: number) =>
    customerRequest<undefined>(`${BASE}/${String(pathId)}`, { method: 'PUT' }),
  leave: (pathId: number) =>
    customerRequest<undefined>(`${BASE}/${String(pathId)}`, { method: 'DELETE' }),
};
