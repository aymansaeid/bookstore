import { adminRequest } from '../session';

/** API §4b admin DTOs: flat lists, hidden entries included. */
export interface AdminCategory {
  id: number;
  slug: string;
  name: string;
  letter: string | null;
  description: string | null;
  parentId: number | null;
  displayOrder: number;
  isActive: boolean;
  bookCount: number;
}

export interface AdminMuhaqqiq {
  id: number;
  slug: string;
  name: string;
  bio: string | null;
  specialties: string[];
  isFeatured: boolean;
  displayOrder: number;
  isActive: boolean;
  worksCount: number;
}

export const adminCatalogApi = {
  categories: (signal?: AbortSignal) =>
    adminRequest<AdminCategory[]>('/api/admin/categories', { signal }),
  muhaqqiqs: (signal?: AbortSignal) =>
    adminRequest<AdminMuhaqqiq[]>('/api/admin/muhaqqiqs', { signal }),
};