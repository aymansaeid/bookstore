import type { Tone } from '@/shared/api/enums';
import { cx } from '@/shared/lib/cx';

import styles from './StatusBadge.module.css';

/** Order and return status pill (API guide §6 / §9 badge colours). */
export function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  return <span className={cx(styles.badge, styles[tone])}>{label}</span>;
}
