import type { PublicOrder } from '@/features/orders/types';
import { cx } from '@/shared/lib/cx';
import { formatDate } from '@/shared/lib/format';
import { Icon } from '@/shared/ui/Icon/Icon';

import styles from './OrderProgress.module.css';

const FLOW = ['PendingPayment', 'Paid', 'Shipped', 'Delivered'] as const;

/**
 * Tracking bar for the normal path (API §6): created → being prepared →
 * shipped → delivered, dated with createdAtUtc / shippedAtUtc /
 * deliveredAtUtc. Side exits (cancelled, expired, refunded) show no bar.
 */
export function OrderProgress({ order }: { order: PublicOrder }) {
  const reached = FLOW.indexOf(order.status as (typeof FLOW)[number]);
  if (reached < 0) return null;

  const pickup = order.shippingMethodCode === 'pickup';
  const steps = [
    { label: 'تم الطلب', date: order.createdAtUtc },
    { label: 'قيد التجهيز', date: null },
    { label: pickup ? 'جاهز للاستلام' : 'تم الشحن', date: order.shippedAtUtc },
    { label: pickup ? 'تم الاستلام' : 'تم التسليم', date: order.deliveredAtUtc },
  ];
  // PendingPayment has only been "ordered"; Paid reaches "being prepared", etc.
  const current = reached;

  return (
    <ol className={styles.progress} aria-label="مراحل الطلب">
      {steps.map((step, index) => {
        const done = index < current || (index === current && order.status === 'Delivered');
        return (
          <li
            key={step.label}
            className={cx(styles.step, done && styles.done, index === current && styles.current)}
            aria-current={index === current ? 'step' : undefined}
          >
            <span className={styles.dot} aria-hidden="true">
              {done ? <Icon name="check" size={14} /> : null}
            </span>
            <span className={styles.label}>{step.label}</span>
            {step.date && index <= current && (
              <span className={styles.date}>{formatDate(step.date)}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
