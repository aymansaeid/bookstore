import { paths } from '@/app/paths';
import { MAX_QUANTITY, useCartStore } from '@/features/cart/cartStore';
import { i18n } from '@/i18n';
import { formatCount } from '@/shared/lib/format';
import { toast } from '@/shared/ui/toast/toastStore';

/** Adds copies and tells the customer what happened (including the 10-copy cap). */
export function addToCartWithFeedback(book: { id: number; title: string }, quantity = 1): void {
  const cart = useCartStore.getState();
  const before = cart.lines.find((line) => line.bookId === book.id)?.quantity ?? 0;
  const after = cart.add(book.id, quantity);

  const viewCart = { label: i18n.t('addToCart.viewCart'), to: paths.cart };
  if (after === before) {
    toast.error(i18n.t('addToCart.atMax', { n: formatCount(MAX_QUANTITY) }));
  } else if (after < before + quantity) {
    toast.success(i18n.t('addToCart.cappedAt', { n: formatCount(after) }), viewCart);
  } else {
    toast.success(i18n.t('addToCart.added', { title: book.title }), viewCart);
  }
}