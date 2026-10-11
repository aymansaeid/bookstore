import { Outlet, ScrollRestoration } from 'react-router';

/** Top of the route tree: concerns shared by every page (storefront, auth, admin). */
export default function RootLayout() {
  return (
    <>
      <Outlet />
      <ScrollRestoration />
    </>
  );
}
