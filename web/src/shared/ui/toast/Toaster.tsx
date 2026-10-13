import { Link } from 'react-router';

import { cx } from '@/shared/lib/cx';
import { Icon } from '@/shared/ui/Icon/Icon';

import styles from './Toaster.module.css';
import { useToastStore } from './toastStore';

/** Spec 5.1 «✓ أُضيف إلى السلة». Above the bottom nav on mobile, bottom-right on desktop. */
export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div className={styles.region} role="status" aria-live="polite">
      {toasts.map((item) => (
        <div key={item.id} className={cx(styles.toast, styles[item.tone])}>
          <span className={styles.icon} aria-hidden="true">
            {item.tone === 'success' ? '✓' : '!'}
          </span>
          <p className={styles.message}>{item.message}</p>
          {item.action && (
            <Link to={item.action.to} className={styles.action}>
              {item.action.label}
            </Link>
          )}
          <button
            type="button"
            className={styles.close}
            aria-label="إغلاق"
            onClick={() => {
              dismiss(item.id);
            }}
          >
            <Icon name="x" size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
