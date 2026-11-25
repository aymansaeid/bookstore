import { useTranslation } from 'react-i18next';

import { cx } from '@/shared/lib/cx';
import { formatCount } from '@/shared/lib/format';

import styles from './CheckoutSteps.module.css';

const STEPS = ['cart', 'checkout', 'done'] as const;

export type CheckoutStep = (typeof STEPS)[number];

/** «السلة ← الشحن والدفع ← التأكيد» (spec 5.6). */
export function CheckoutSteps({ current }: { current: CheckoutStep }) {
  const { t } = useTranslation('checkout', { keyPrefix: 'steps' });
  const currentIndex = STEPS.indexOf(current);
  return (
    <ol className={styles.steps} aria-label={t('label')}>
      {STEPS.map((step, index) => (
        <li
          key={step}
          className={cx(
            styles.step,
            index < currentIndex && styles.done,
            index === currentIndex && styles.current,
          )}
          aria-current={index === currentIndex ? 'step' : undefined}
        >
          <span className={styles.number}>
            {index < currentIndex ? '✓' : formatCount(index + 1)}
          </span>
          {t(step)}
        </li>
      ))}
    </ol>
  );
}