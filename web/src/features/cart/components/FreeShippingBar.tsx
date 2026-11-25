import { useTranslation } from 'react-i18next';

import type { Quote } from '@/features/checkout/types';
import { cx } from '@/shared/lib/cx';
import { formatMoney } from '@/shared/lib/format';
import { Icon } from '@/shared/ui/Icon/Icon';

import styles from './FreeShippingBar.module.css';

/** Spec 5.6 «مبروك! طلبك مؤهل للشحن المجاني». Hidden when the zone has no threshold. */
export function FreeShippingBar({ quote }: { quote: Quote }) {
  const { t } = useTranslation('checkout', { keyPrefix: 'freeShipping' });
  const free = quote.freeShipping;
  if (!free) return null;
  const percent = free.qualified
    ? 100
    : Math.max(0, Math.min(100, ((free.threshold - free.remaining) / free.threshold) * 100));

  return (
    <div className={cx(styles.bar, free.qualified && styles.qualified)}>
      <p className={styles.text}>
        <Icon name="truck" size={18} />
        {free.qualified
          ? t('qualified')
          : t('remaining', { amount: formatMoney(free.remaining, quote.currency) })}
      </p>
      <div
        className={styles.track}
        role="progressbar"
        aria-label={t('progress')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
      >
        <span style={{ inlineSize: `${percent}%` }} />
      </div>
    </div>
  );
}