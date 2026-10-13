import { Outlet } from 'react-router';

import { EffendiPanel } from '@/features/auth/components/EffendiPanel';

import styles from './AuthLayout.module.css';

/**
 * Spec 5.8 split screen: form on paper (right), Efendi on ink (left).
 * Under 1024px only the form shows.
 */
export default function AuthLayout() {
  return (
    <div className={styles.root}>
      <main id="main-content" className={styles.main}>
        <div className={styles.column}>
          <Outlet />
        </div>
      </main>
      <EffendiPanel className={styles.panel} />
    </div>
  );
}
