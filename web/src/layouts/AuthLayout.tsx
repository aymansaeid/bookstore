import { Outlet } from 'react-router';

/**
 * Bare full-screen layout for login, register and the email-link pages:
 * no store header or footer (spec 5.8). Step 13 adds the split paper/ink panels.
 */
export default function AuthLayout() {
  return (
    <main id="main-content">
      <Outlet />
    </main>
  );
}
