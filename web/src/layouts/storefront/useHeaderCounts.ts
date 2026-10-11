/**
 * Single source for the header and bottom-nav counters.
 * Step 4 wires wishlist + notifications to the session; step 5 wires the cart.
 */
export function useHeaderCounts() {
  return { cart: 0, wishlist: 0, notifications: 0 };
}
