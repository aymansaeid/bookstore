import { useTranslation } from 'react-i18next';

import styles from './RouteLoading.module.css';

/** Shown while the first route chunk loads (React Router's HydrateFallback). */
export function RouteLoading() {
  const { t } = useTranslation();
  return (
    <div className={styles.root} role="status" aria-live="polite">
      {t('loading')}
    </div>
  );
}