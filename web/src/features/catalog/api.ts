import { apiRequest } from '@/shared/api/http';

import type { CatalogSearchParams, CatalogSearchResult, CategoryRef } from './types';

/** API guide §4b PublicCategoryDto (two-level tree). */
export interface Category extends CategoryRef {
  /** Decorative Ruqaʿa letter for top-level home tiles. */
  letter: string | null;
  description: string | null;
  bookCount: number;
  parent: CategoryRef | null;
  children: Category[];
}

export const catalogApi = {
  categories: (signal?: AbortSignal) => apiRequest<Category[]>('/api/categories', { signal }),
  search: (params: CatalogSearchParams, signal?: AbortSignal) =>
    apiRequest<CatalogSearchResult>('/api/catalog/search', { query: { ...params }, signal }),
};
