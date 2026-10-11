import { cx } from '@/shared/lib/cx';
import { formatBadgeCount } from '@/shared/lib/format';

import styles from './CountBadge.module.css';

/** Red counter bubble (spec §4.1). Renders nothing at 0. The parent link carries the accessible count. */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span className={cx(styles.badge, className)} aria-hidden="true">
      {formatBadgeCount(count)}
    </span>
  );
}
