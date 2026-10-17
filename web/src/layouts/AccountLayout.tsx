import { Navigate, Outlet, useLocation } from 'react-router';

import { paths } from '@/app/paths';
import { AccountNav } from '@/features/account/components/AccountNav';
import { useSession } from '@/features/auth/session';
import { cx } from '@/shared/lib/cx';

import styles from './AccountLayout.module.css';

/**
 * «حسابي» (spec 5.9). Waits for the startup refresh, sends guests to login
 * with a return path, then shows the sidebar next to the page.
 */
export default function AccountLayout() {
  const { status, customer } = useSession();
  const location = useLocation();

  if (status === 'unknown') {
    return (
      <p className={styles.checking} role="status">
        جارٍ التحقق من حسابك…
      </p>
    );
  }

  if (status === 'guest' || !customer) {
    return <Navigate to={paths.loginWithReturn(location.pathname + location.search)} replace />;
  }

  return (
    <div className={cx('wrap', styles.layout)}>
      <AccountNav customer={customer} />
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}
