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
  /** Hidden books included. */
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

/** PUT /categories/{id}. The slug is fixed after creation. */
export interface CategoryInput {
  name: string;
  letter: string | null;
  description: string | null;
  parentId: number | null;
  displayOrder: number;
}

export interface NewCategoryInput extends CategoryInput {
  /** null → made from the name. */
  slug: string | null;
}

export interface MuhaqqiqInput {
  name: string;
  bio: string | null;
  specialties: string[];
  isFeatured: boolean;
  displayOrder: number;
}

export interface NewMuhaqqiqInput extends MuhaqqiqInput {
  slug: string | null;
}

/** Category.cs / Muhaqqiq.cs limits. */
export const CATALOG_LIMITS = {
  categoryName: 100,
  categoryDescription: 500,
  letter: 8,
  slug: 200,
  muhaqqiqName: 200,
  bio: 2000,
  specialties: 10,
  specialtyLength: 50,
  maxDisplayOrder: 10_000,
} as const;

const CATEGORIES = '/api/admin/categories';
const MUHAQQIQS = '/api/admin/muhaqqiqs';
const at = (base: string, id: number) => `${base}/${String(id)}`;

export const adminCatalogApi = {
  categories: (signal?: AbortSignal) => adminRequest<AdminCategory[]>(CATEGORIES, { signal }),
  createCategory: (body: NewCategoryInput) =>
    adminRequest<AdminCategory>(CATEGORIES, { method: 'POST', body }),
  updateCategory: (id: number, body: CategoryInput) =>
    adminRequest<AdminCategory>(at(CATEGORIES, id), { method: 'PUT', body }),
  setCategoryActive: (id: number, isActive: boolean) =>
    adminRequest<undefined>(`${at(CATEGORIES, id)}/active`, { method: 'PUT', body: { isActive } }),
  /** 409 while it has subcategories or books. */
  deleteCategory: (id: number) => adminRequest<undefined>(at(CATEGORIES, id), { method: 'DELETE' }),

  muhaqqiqs: (signal?: AbortSignal) => adminRequest<AdminMuhaqqiq[]>(MUHAQQIQS, { signal }),
  createMuhaqqiq: (body: NewMuhaqqiqInput) =>
    adminRequest<AdminMuhaqqiq>(MUHAQQIQS, { method: 'POST', body }),
  updateMuhaqqiq: (id: number, body: MuhaqqiqInput) =>
    adminRequest<AdminMuhaqqiq>(at(MUHAQQIQS, id), { method: 'PUT', body }),
  setMuhaqqiqActive: (id: number, isActive: boolean) =>
    adminRequest<undefined>(`${at(MUHAQQIQS, id)}/active`, { method: 'PUT', body: { isActive } }),
  /** 409 while any book credits them. */
  deleteMuhaqqiq: (id: number) => adminRequest<undefined>(at(MUHAQQIQS, id), { method: 'DELETE' }),
};