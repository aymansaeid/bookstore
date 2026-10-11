import { Outlet } from 'react-router';

/**
 * Chrome-less pages that are not part of the store: the admin sign-in and the
 * development stand-in for the payment provider's hosted page. Owns the single
 * <main> landmark so the page itself only renders its content.
 */
export default function BareLayout() {
  return (
    <main id="main-content">
      <Outlet />
    </main>
  );
}
