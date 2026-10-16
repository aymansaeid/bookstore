import { formatAmount } from '@/shared/lib/format';

import styles from './Stars.module.css';

/** Read-only 0–5 stars, filled from the right (RTL). */
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const percent = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span
      className={styles.stars}
      style={{ fontSize: size }}
      role="img"
      aria-label={`${formatAmount(value)} من ٥`}
    >
      <span className={styles.base} aria-hidden="true">
        ★★★★★
      </span>
      <span className={styles.fill} style={{ inlineSize: `${percent}%` }} aria-hidden="true">
        ★★★★★
      </span>
    </span>
  );
}
