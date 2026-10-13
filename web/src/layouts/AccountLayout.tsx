import { Navigate, Outlet, useLocation } from 'react-router';

import { paths } from '@/app/paths';
import { useSession } from '@/features/auth/session';

import styles from './AccountLayout.module.css';

/**
 * «حسابي» guard. Waits for the startup refresh, then sends guests to login
 * with a return path. Step 14 adds the sidebar (spec 5.9).
 */
export default function AccountLayout() {
  const { status } = useSession();
  const location = useLocation();

  if (status === 'unknown') {
    return (
      <p className={styles.checking} role="status">
        جارٍ التحقق من حسابك…
      </p>
    );
  }

  if (status === 'guest') {
    return <Navigate to={paths.loginWithReturn(location.pathname + location.search)} replace />;
  }

  return <Outlet />;
}
