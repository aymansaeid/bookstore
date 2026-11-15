import { useTranslation } from 'react-i18next';

import { saveLanguage } from '@/app/languagePreference';
import { DEFAULT_LANGUAGE, pathInLanguage } from '@/app/locale';
import { paths } from '@/app/paths';
import { buttonClass } from '@/shared/ui/Button/buttonClass';

import styles from './CheckoutClosedNotice.module.css';

/**
 * Turkish checkout needs the Turkish contract and pre-information form; until
 * they're published the API reports termsAvailable: false (API §2b). Say so
 * and offer the Arabic checkout, which keeps the same cart.
 */
export function CheckoutClosedNotice() {
  const { t } = useTranslation(undefined, { keyPrefix: 'checkoutClosed' });
  return (
    <div className={styles.notice} role="alert">
      <p className={styles.title}>{t('title')}</p>
      <p className={styles.text}>{t('text')}</p>
      <a
        href={pathInLanguage(DEFAULT_LANGUAGE, paths.checkout)}
        hrefLang={DEFAULT_LANGUAGE}
        className={buttonClass('ghost', 'sm')}
        onClick={() => {
          // Remembered, or the saved language would send them straight back here.
          saveLanguage(DEFAULT_LANGUAGE);
        }}
      >
        {t('action')}
      </a>
    </div>
  );
}