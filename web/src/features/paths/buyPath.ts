import { useCartStore } from '@/features/cart/cartStore';

/**
 * «اشترِ المسار كاملاً» (API §7d): one copy of every path book the customer
 * doesn't own, plus readingPathId so the quote applies the path discount.
 * Books already in the cart keep their quantity.
 */
export function addPathToCart(pathId: number, bookIds: readonly number[], discounted: boolean) {
  const cart = useCartStore.getState();
  const inCart = new Set(cart.lines.map((line) => line.bookId));
  for (const id of bookIds) {
    if (!inCart.has(id)) cart.add(id);
  }
  if (discounted) cart.setReadingPath(pathId);
}
