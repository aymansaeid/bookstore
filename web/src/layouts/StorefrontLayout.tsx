import { Outlet } from 'react-router';

/**
 * Storefront chrome. Step 6 adds the announcement bar, header, mobile bottom
 * nav, Efendi FAB and footer around this outlet.
 */
export default function StorefrontLayout() {
  return (
    <main id="main-content">
      <Outlet />
    </main>
  );
}
