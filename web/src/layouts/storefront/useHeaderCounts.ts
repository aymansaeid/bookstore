import { useCustomerSummary, useUnreadNotificationsCount } from '@/features/account/queries';
import { useCartLineCount } from '@/features/cart/cartStore';

/** Single source for the header and bottom-nav counters. Customer counts are 0 for guests. */
export function useHeaderCounts() {
  const cart = useCartLineCount();
  const summary = useCustomerSummary();
  const unread = useUnreadNotificationsCount();
  return {
    cart,
    wishlist: summary.data?.wishlistCount ?? 0,
    notifications: unread.data ?? 0,
  };
}
