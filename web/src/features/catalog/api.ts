import { apiRequest } from '@/shared/api/http';

export interface CategoryRef {
  id: number;
  slug: string;
  name: string;
}

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
};
