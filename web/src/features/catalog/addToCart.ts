import { paths } from '@/app/paths';
import { MAX_QUANTITY, useCartStore } from '@/features/cart/cartStore';
import { formatCount } from '@/shared/lib/format';
import { toast } from '@/shared/ui/toast/toastStore';

/** Adds one copy and tells the customer what happened. */
export function addToCartWithFeedback(book: { id: number; title: string }): void {
  const cart = useCartStore.getState();
  const before = cart.lines.find((line) => line.bookId === book.id)?.quantity ?? 0;
  const after = cart.add(book.id);

  if (after === before) {
    toast.error(`وصلت إلى الحد الأقصى (${formatCount(MAX_QUANTITY)} نسخ) من هذا الكتاب.`);
  } else {
    toast.success(`أُضيف «${book.title}» إلى السلة`, { label: 'عرض السلة', to: paths.cart });
  }
}
