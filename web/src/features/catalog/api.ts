import { apiRequest } from '@/shared/api/http';

import type {
  CatalogSearchParams,
  CatalogSearchResult,
  CategoryRef,
  PublicMuhaqqiq,
} from './types';

/** API guide §4b PublicCategoryDto (two-level tree). */
export interface Category extends CategoryRef {
  /** Decorative Ruqaʿa letter for top-level home tiles. */
  letter: string | null;
  description: string | null;
  bookCount: number;
  parent: CategoryRef | null;
  children: Category[];
}

const slugPath = (base: string, slug: string) => `${base}/${encodeURIComponent(slug)}`;

export const catalogApi = {
  categories: (signal?: AbortSignal) => apiRequest<Category[]>('/api/categories', { signal }),
  category: (slug: string) => apiRequest<Category>(slugPath('/api/categories', slug)),
  muhaqqiqs: (featured?: boolean) =>
    apiRequest<PublicMuhaqqiq[]>('/api/muhaqqiqs', { query: { featured } }),
  muhaqqiq: (slug: string) => apiRequest<PublicMuhaqqiq>(slugPath('/api/muhaqqiqs', slug)),
  search: (params: CatalogSearchParams, signal?: AbortSignal) =>
    apiRequest<CatalogSearchResult>('/api/catalog/search', { query: { ...params }, signal }),
};
