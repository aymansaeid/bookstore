import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { cx } from '@/shared/lib/cx';
import { countriesPhrase, formatAmount } from '@/shared/lib/format';
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
  const shippingText =
    freeShippingThreshold === undefined
      ? 'شحن سريع داخل تركيا'
      : `شحن مجاني فوق ${formatAmount(freeShippingThreshold)} ₺ داخل تركيا`;
  const countriesText =
    countriesShippedTo === undefined
      ? 'توصيل إلى دول العالم'
      : `توصيل إلى ${countriesPhrase(countriesShippedTo)}`;

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
          <span className={styles.new}>جديد:</span>
          <span className={styles.midText}>
            أفندي الذكي يقترح لك <b>مسار قراءة</b> مخصّصاً لمستواك واهتمامك
          </span>
        </Link>

        <div className={styles.side}>
          <span>العربية</span>
          <span lang="en" dir="ltr">
            TRY ₺
          </span>
          <Link to={paths.trackOrder} className={styles.link}>
            تتبّع الطلب
          </Link>
        </div>
      </div>
    </div>
  );
}
