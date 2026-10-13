import { customerRequest } from '@/features/auth/session';

/** API guide §8. Add and remove are idempotent (204). */
export interface WishlistItem {
  bookId: number;
  slug: string;
  title: string;
  author: string;
  price: number;
  currency: string;
  inStock: boolean;
  coverImageUrl: string | null;
  coverThumbnailUrl?: string | null;
  addedAtUtc: string;
}

const BASE = '/api/customers/me/wishlist';

export const wishlistApi = {
  list: () => customerRequest<WishlistItem[]>(BASE),
  add: (bookId: number) => customerRequest<undefined>(`${BASE}/${bookId}`, { method: 'PUT' }),
  remove: (bookId: number) => customerRequest<undefined>(`${BASE}/${bookId}`, { method: 'DELETE' }),
};
