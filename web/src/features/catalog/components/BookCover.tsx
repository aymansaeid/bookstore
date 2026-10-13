import { cx } from '@/shared/lib/cx';

import styles from './BookCover.module.css';

interface BookCoverProps {
  title: string;
  src: string | null;
  srcSet?: string | null | undefined;
  /** API guide §4e suggested sizes for this placement. */
  sizes: string;
  /** Above-the-fold covers load eagerly (spec §8.4). */
  priority?: boolean;
  className?: string;
}

/**
 * 3D hardcover: 2 : 2.95, spine and inner shadow on the RIGHT (spec §8.5).
 * Without an uploaded image it draws a framed cloth cover with the title.
 */
export function BookCover({
  title,
  src,
  srcSet,
  sizes,
  priority = false,
  className,
}: BookCoverProps) {
  return (
    <div className={cx(styles.cover, !src && styles.drawn, className)}>
      {src ? (
        <img
          className={styles.image}
          src={src}
          srcSet={srcSet ?? undefined}
          sizes={sizes}
          width={400}
          height={590}
          alt=""
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
        />
      ) : (
        <span className={styles.drawnTitle}>{title}</span>
      )}
    </div>
  );
}
