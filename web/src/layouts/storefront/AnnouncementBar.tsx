import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { LANGUAGE_NAMES, UI_LANGUAGE } from '@/app/locale';
import { paths } from '@/app/paths';
import { useStoreConfig } from '@/features/store/queries';
import { cx } from '@/shared/lib/cx';
import { formatAmount, formatCount } from '@/shared/lib/format';
import { Spark } from '@/shared/ui/Spark/Spark';

import styles from './AnnouncementBar.module.css';

interface AnnouncementBarProps {
  /** From GET /api/shipping/rates (TR row), wired in step 3. */
  freeShippingThreshold?: number;
  /** Number of countries in GET /api/shipping/rates. */
  countriesShippedTo?: number;
}

export function AnnouncementBar({
  freeShippingThreshold,
  countriesShippedTo,
}: AnnouncementBarProps) {
  const { t } = useTranslation();
  // The store can set its own announcement per language (API §2b); else ours.
  const announcement = useStoreConfig().data?.announcement;
  const shippingText =
    freeShippingThreshold === undefined
      ? t('announcement.shippingFast')
      : t('announcement.shippingFree', { amount: formatAmount(freeShippingThreshold) });
  // `n` is the count in the page's digits (٥ in Arabic); `count` picks the plural form.
  const countriesText =
    countriesShippedTo === undefined
      ? t('announcement.worldwide')
      : t('announcement.countries', {
          count: countriesShippedTo,
          n: formatCount(countriesShippedTo),
        });

  return (
    <div className={styles.root}>
      <div className={cx('wrap', styles.inner)}>
        <p className={styles.side}>
          <span>{shippingText}</span>
          <span className={styles.dot} aria-hidden="true" />
          <span>{countriesText}</span>
        </p>

        <Link to={paths.readingPaths} className={styles.mid}>
          <Spark size={14} />
          <span className={styles.new}>{t('announcement.new')}</span>
          <span className={styles.midText}>
            {announcement ?? <Trans t={t} i18nKey="announcement.promo" components={{ b: <b /> }} />}
          </span>
        </Link>

        <div className={styles.side}>
          <span>{LANGUAGE_NAMES[UI_LANGUAGE]}</span>
          <span lang="en" dir="ltr">
            TRY ₺
          </span>
          <Link to={paths.trackOrder} className={styles.link}>
            {t('announcement.trackOrder')}
          </Link>
        </div>
      </div>
    </div>
  );
}