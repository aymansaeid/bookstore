import { Link } from 'react-router';

import { cx } from '@/shared/lib/cx';
import { formatCount } from '@/shared/lib/format';
import { Icon } from '@/shared/ui/Icon/Icon';

import styles from './Pagination.module.css';

/** 1 … 4 5 6 … 20 */
function compactPages(page: number, total: number): (number | 'gap')[] {
  const wanted = new Set([1, total, page - 1, page, page + 1]);
  const pages = [...wanted].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const result: (number | 'gap')[] = [];
  for (const [index, n] of pages.entries()) {
    const previous = pages[index - 1];
    if (previous !== undefined && n - previous > 1) result.push('gap');
    result.push(n);
  }
  return result;
}

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Real links, so pages are shareable and crawlable. */
  hrefFor: (page: number) => string;
}

export function Pagination({ page, totalPages, hrefFor }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav className={styles.nav} aria-label="الصفحات">
      {page > 1 ? (
        <Link to={hrefFor(page - 1)} className={styles.step} aria-label="الصفحة السابقة">
          <Icon name="arrowr" size={18} />
        </Link>
      ) : (
        <span className={cx(styles.step, styles.disabled)} aria-hidden="true">
          <Icon name="arrowr" size={18} />
        </span>
      )}

      <ol className={styles.pages}>
        {compactPages(page, totalPages).map((item, index) =>
          item === 'gap' ? (
            <li key={`gap-${index}`} className={styles.gap} aria-hidden="true">
              …
            </li>
          ) : (
            <li key={item}>
              <Link
                to={hrefFor(item)}
                className={cx(styles.page, item === page && styles.current)}
                aria-current={item === page ? 'page' : undefined}
                aria-label={`الصفحة ${formatCount(item)}`}
              >
                {formatCount(item)}
              </Link>
            </li>
          ),
        )}
      </ol>

      {page < totalPages ? (
        <Link to={hrefFor(page + 1)} className={styles.step} aria-label="الصفحة التالية">
          <Icon name="arrow" size={18} />
        </Link>
      ) : (
        <span className={cx(styles.step, styles.disabled)} aria-hidden="true">
          <Icon name="arrow" size={18} />
        </span>
      )}
    </nav>
  );
}
