import { useStoreConfig } from '@/features/store/queries';
import { useTranslation } from 'react-i18next';
import styles from './TestModeBanner.module.css';

export function TestModeBanner() {
  const { t } = useTranslation();
  const { data } = useStoreConfig();
  if (!data?.isTestMode) return null;

return (
    <p className={styles.root} role="status">
      <b>{t('testMode.label')}</b> {t('testMode.text')}
    </p>
  );
}
