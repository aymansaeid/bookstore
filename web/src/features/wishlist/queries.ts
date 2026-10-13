import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { meKeys, useCustomerId } from '@/features/account/queries';
import type { BookCardData } from '@/features/catalog/types';
import { errorMessage } from '@/shared/api/errorMessages';
import { toast } from '@/shared/ui/toast/toastStore';

import { type WishlistItem, wishlistApi } from './api';

export const wishlistKeys = {
  all: ['me', 'wishlist'] as const,
  list: (customerId: number) => ['me', 'wishlist', customerId] as const,
};

export function useWishlist() {
  const customerId = useCustomerId();
  return useQuery({
    queryKey: wishlistKeys.list(customerId ?? 0),
    queryFn: () => wishlistApi.list(),
    enabled: customerId !== null,
  });
}

/** Book ids in the wishlist; empty for guests. Cheap: every heart shares one query. */
export function useWishlistIds(): ReadonlySet<number> {
  const { data } = useWishlist();
  return useMemo(() => new Set(data?.map((item) => item.bookId)), [data]);
}

const toItem = (book: BookCardData): WishlistItem => ({
  bookId: book.id,
  slug: book.slug,
  title: book.title,
  author: book.author,
  price: book.price,
  currency: book.currency,
  inStock: book.inStock,
  coverImageUrl: book.coverImageUrl,
  addedAtUtc: new Date().toISOString(),
});

/** Saved instantly; rolls back with an Arabic message if the server refuses. */
export function useToggleWishlist() {
  const queryClient = useQueryClient();
  const customerId = useCustomerId();
  const key = wishlistKeys.list(customerId ?? 0);

  return useMutation({
    mutationFn: ({ book, saved }: { book: BookCardData; saved: boolean }) =>
      saved ? wishlistApi.remove(book.id) : wishlistApi.add(book.id),
    onMutate: async ({ book, saved }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<WishlistItem[]>(key);
      queryClient.setQueryData<WishlistItem[]>(key, (items = []) =>
        saved ? items.filter((item) => item.bookId !== book.id) : [toItem(book), ...items],
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      queryClient.setQueryData(key, context?.previous);
      toast.error(errorMessage(error));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
      void queryClient.invalidateQueries({ queryKey: [...meKeys.all, 'summary'] });
    },
  });
}
