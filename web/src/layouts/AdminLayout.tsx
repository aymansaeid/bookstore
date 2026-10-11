import { Outlet } from 'react-router';

/**
 * Admin shell, loaded in its own chunk so none of it reaches storefront
 * visitors. Step 18 adds the admin-token guard, dark sidebar and top bar (spec 5.10).
 */
export default function AdminLayout() {
  return (
    <main id="main-content">
      <Outlet />
    </main>
  );
}
