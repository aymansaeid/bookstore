import { Outlet } from 'react-router';

import { EffendiPanel } from '@/features/auth/components/EffendiPanel';
import { LanguageAlternates } from '@/layouts/storefront/LanguageAlternates';
import { LanguageSwitcher } from '@/shared/ui/LanguageSwitcher/LanguageSwitcher';

import styles from './AuthLayout.module.css';

/**
 * Spec 5.8 split screen: form on paper (right in Arabic), Efendi on ink.
 * Under 1024px only the form shows. The language links sit under the form,
 * so someone who landed here from an email can switch before signing in.
 */
export default function AuthLayout() {
  return (
    <div className={styles.root}>
      <LanguageAlternates />
      <main id="main-content" className={styles.main}>
        <div className={styles.column}>
          <Outlet />
          <LanguageSwitcher variant="inline" className={styles.languages} />
        </div>
      </main>
      <EffendiPanel className={styles.panel} />
    </div>
  );
}