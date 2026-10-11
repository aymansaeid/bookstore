import { Outlet } from 'react-router';

/**
 * «حسابي» section inside the storefront chrome. Step 4 adds the sign-in guard;
 * step 14 adds the sidebar (spec 5.9). The storefront layout already owns <main>.
 */
export default function AccountLayout() {
  return <Outlet />;
}
