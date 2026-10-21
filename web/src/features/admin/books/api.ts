import type { BookImage } from '@/features/catalog/types';
import type { BookBadge, BookFormat, ReaderLevel } from '@/shared/api/enums';

import { adminRequest } from '../session';

/** API §10 AdminBookDto: the public fields plus exact stock and every admin setting. */
export interface AdminBook {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  author: string;
  /** Empty string when none was given. */
  isbn: string;
  description: string;
  format: BookFormat;
  pageCount: number;
  language: string;
  publisher: string | null;
  /** YYYY-MM-DD */
  publicationDate: string | null;
  weightGrams: number;
  heightMm: number;
  widthMm: number;
  depthMm: number;
  price: number;
  currency: string;
  stockQuantity: number;
  /** Held by unpaid checkouts. */
  reservedQuantity: number;
  availableToSell: number;
  isActive: boolean;
  images: BookImage[];
  lowStockThreshold: number;
  isLowStock: boolean;
  categoryId: number | null;
  muhaqqiqIds: number[];
  level: ReaderLevel | null;
  volumes: number | null;
  compareAtPrice: number | null;
  installmentsAllowed: boolean;
  highlights: string[];
  badges: BookBadge[];
  editionLabel: string | null;
  editionGroupId: number | null;
  relatedBookIds: number[];
}

/** PUT /books/{id}: everything but slug, ISBN and stock. */
export interface BookDetailsInput {
  title: string;
  subtitle: string | null;
  author: string;
  description: string | null;
  format: BookFormat;
  pageCount: number;
  language: string;
  publisher: string | null;
  publicationDate: string | null;
  weightGrams: number;
  heightMm: number;
  widthMm: number;
  depthMm: number;
  price: number;
}

/** POST /books: slug and ISBN are permanent after this. Empty slug → made from the title. */
export interface NewBookInput extends BookDetailsInput {
  slug: string | null;
  isbn: string | null;
  initialStock: number;
}

/** PUT /books/{id}/merchandising: full replacement, null clears. */
export interface MerchandisingInput {
  level: ReaderLevel | null;
  volumes: number | null;
  compareAtPrice: number | null;
  installmentsAllowed: boolean;
  highlights: string[];
  badges: BookBadge[];
  editionLabel: string | null;
}

/** API limits (Book.cs). */
export const BOOK_LIMITS = {
  maxImages: 8,
  maxImageBytes: 5 * 1024 * 1024,
  maxMuhaqqiqs: 6,
  maxHighlights: 12,
  maxHighlightLength: 200,
  maxEditionLabel: 100,
   maxVolumes: 500,
  maxEditions: 20,
  maxRelated: 12,
} as const;

const BASE = '/api/admin/books';
const one = (id: number) => `${BASE}/${String(id)}`;

export const adminBooksApi = {
  /** Every book, hidden ones too, with exact stock. Not paged. */
  list: (signal?: AbortSignal) => adminRequest<AdminBook[]>(BASE, { signal }),
  get: (id: number) => adminRequest<AdminBook>(one(id)),
  create: (body: NewBookInput) => adminRequest<AdminBook>(BASE, { method: 'POST', body }),
  update: (id: number, body: BookDetailsInput) =>
    adminRequest<AdminBook>(one(id), { method: 'PUT', body }),
  /** Sets the counted stock; the note is required and goes to the stock ledger. */
  setStock: (id: number, newStockQuantity: number, note: string) =>
    adminRequest<AdminBook>(`${one(id)}/stock`, {
      method: 'PUT',
      body: { newStockQuantity, note },
    }),
  setActive: (id: number, isActive: boolean) =>
    adminRequest<undefined>(`${one(id)}/active`, { method: 'PUT', body: { isActive } }),
  setThreshold: (id: number, threshold: number) =>
    adminRequest<AdminBook>(`/api/admin/inventory/books/${String(id)}/low-stock-threshold`, {
      method: 'PUT',
      body: { threshold },
    }),
  setTaxonomy: (id: number, categoryId: number | null, muhaqqiqIds: number[]) =>
    adminRequest<AdminBook>(`${one(id)}/taxonomy`, {
      method: 'PUT',
      body: { categoryId, muhaqqiqIds },
    }),
  setMerchandising: (id: number, body: MerchandisingInput) =>
    adminRequest<AdminBook>(`${one(id)}/merchandising`, { method: 'PUT', body }),

    /** The OTHER editions of the same work; [] takes this book out of its group. */
  setEditions: (id: number, bookIds: number[]) =>
    adminRequest<AdminBook>(`${one(id)}/editions`, { method: 'PUT', body: { bookIds } }),
  /** «يُكمل مكتبتك» on the book page, in this order. */
  setRelated: (id: number, bookIds: number[]) =>
    adminRequest<AdminBook>(`${one(id)}/related`, { method: 'PUT', body: { bookIds } }),

  /** multipart: file (JPEG, PNG or WebP, max 5 MB) + altText. The first image becomes the cover. */
  uploadImage: (id: number, file: File, altText: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('altText', altText);
    return adminRequest<BookImage>(`${one(id)}/images`, { method: 'POST', formData });
  },
  deleteImage: (id: number, imageId: number) =>
    adminRequest<undefined>(`${one(id)}/images/${String(imageId)}`, { method: 'DELETE' }),
  setCover: (id: number, imageId: number) =>
    adminRequest<undefined>(`${one(id)}/images/${String(imageId)}/cover`, { method: 'PUT' }),
  /** Must list every image exactly once. */
  reorderImages: (id: number, imageIdsInOrder: number[]) =>
    adminRequest<undefined>(`${one(id)}/images/order`, {
      method: 'PUT',
      body: { imageIdsInOrder },
    }),
};