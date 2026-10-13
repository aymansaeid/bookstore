import { useCustomerSummary, useUnreadNotificationsCount } from '@/features/account/queries';

/**
 * Single source for the header and bottom-nav counters. Guests see none.
 * The cart count is wired to the cart store in step 5.
 */
export function useHeaderCounts() {
  const summary = useCustomerSummary();
  const unread = useUnreadNotificationsCount();
  return {
    cart: 0,
    wishlist: summary.data?.wishlistCount ?? 0,
    notifications: unread.data ?? 0,
  };
}
