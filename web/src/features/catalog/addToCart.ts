import { paths } from '@/app/paths';
import { MAX_QUANTITY, useCartStore } from '@/features/cart/cartStore';
import { formatCount } from '@/shared/lib/format';
import { toast } from '@/shared/ui/toast/toastStore';

/** Adds copies and tells the customer what happened (including the 10-copy cap). */
export function addToCartWithFeedback(book: { id: number; title: string }, quantity = 1): void {
  const cart = useCartStore.getState();
  const before = cart.lines.find((line) => line.bookId === book.id)?.quantity ?? 0;
  const after = cart.add(book.id, quantity);

  if (after === before) {
    toast.error(`وصلت إلى الحد الأقصى (${formatCount(MAX_QUANTITY)} نسخ) من هذا الكتاب.`);
  } else if (after < before + quantity) {
    toast.success(`صار في سلتك ${formatCount(after)} نسخ، وهو الحد الأقصى.`, {
      label: 'عرض السلة',
      to: paths.cart,
    });
  } else {
    toast.success(`أُضيف «${book.title}» إلى السلة`, { label: 'عرض السلة', to: paths.cart });
  }
}
