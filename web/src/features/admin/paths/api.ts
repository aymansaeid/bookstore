import type { ReaderLevel } from '@/shared/api/enums';

import { adminRequest } from '../session';

export interface AdminPathStage {
  stageNumber: number;
  bookId: number;
  /** Why this book comes at this point («لماذا هذا الكتاب الآن؟»). */
  reason: string;
  estimatedWeeks: number | null;
}

/** API §7d AdminReadingPathDto. */
export interface AdminReadingPath {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  level: ReaderLevel;
  estimatedWeeks: number;
  discountPercentage: number;
  isFeatured: boolean;
  displayOrder: number;
  isActive: boolean;
  stages: AdminPathStage[];
  /** Readers following it; a path with any can't be deleted. */
  enrollmentCount: number;
}

/** POST and PUT share it: a full replacement, stages in order. PUT ignores the slug. */
export interface ReadingPathInput {
  title: string;
  slug: string | null;
  description: string | null;
  level: ReaderLevel;
  estimatedWeeks: number;
  discountPercentage: number;
  isFeatured: boolean;
  displayOrder: number;
  stages: { bookId: number; reason: string; estimatedWeeks: number | null }[];
}

/** ReadingPath.cs limits. */
export const PATH_LIMITS = {
  title: 200,
  description: 1000,
  reason: 300,
  slug: 200,
  minStages: 2,
  maxStages: 10,
  maxDiscount: 50,
  maxWeeks: 520,
  maxStageWeeks: 104,
  maxDisplayOrder: 10_000,
} as const;

const BASE = '/api/admin/reading-paths';
const one = (id: number) => `${BASE}/${String(id)}`;

export const adminPathsApi = {
  /** Every path, hidden ones too. There is no single-path endpoint. */
  list: (signal?: AbortSignal) => adminRequest<AdminReadingPath[]>(BASE, { signal }),
  create: (body: ReadingPathInput) =>
    adminRequest<AdminReadingPath>(BASE, { method: 'POST', body }),
  update: (id: number, body: ReadingPathInput) =>
    adminRequest<AdminReadingPath>(one(id), { method: 'PUT', body }),
  setActive: (id: number, isActive: boolean) =>
    adminRequest<undefined>(`${one(id)}/active`, { method: 'PUT', body: { isActive } }),
  /** 409 while readers follow it. */
  remove: (id: number) => adminRequest<undefined>(one(id), { method: 'DELETE' }),
};