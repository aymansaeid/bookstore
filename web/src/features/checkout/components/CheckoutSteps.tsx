import { cx } from '@/shared/lib/cx';

import styles from './CheckoutSteps.module.css';

const STEPS = [
  { id: 'cart', label: 'السلة' },
  { id: 'checkout', label: 'الشحن والدفع' },
  { id: 'done', label: 'التأكيد' },
] as const;

export type CheckoutStep = (typeof STEPS)[number]['id'];

/** «السلة ← الشحن والدفع ← التأكيد» (spec 5.6). */
export function CheckoutSteps({ current }: { current: CheckoutStep }) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);
  return (
    <ol className={styles.steps} aria-label="خطوات الطلب">
      {STEPS.map((step, index) => (
        <li
          key={step.id}
          className={cx(
            styles.step,
            index < currentIndex && styles.done,
            index === currentIndex && styles.current,
          )}
          aria-current={index === currentIndex ? 'step' : undefined}
        >
          <span className={styles.number}>
            {index < currentIndex ? '✓' : (index + 1).toLocaleString('ar-EG')}
          </span>
          {step.label}
        </li>
      ))}
    </ol>
  );
}
