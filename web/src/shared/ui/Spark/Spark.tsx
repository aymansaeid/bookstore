import { cx } from '@/shared/lib/cx';

import styles from './Spark.module.css';

/** The ✦ AI mark: four-point star with a red→gold gradient (spec §3.5). */
export function Spark({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cx(styles.spark, className)}
      style={{ inlineSize: size, blockSize: size }}
      aria-hidden="true"
    />
  );
}
