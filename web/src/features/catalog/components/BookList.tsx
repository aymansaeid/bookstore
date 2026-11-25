import type { BookCardData } from '@/features/catalog/types';
import { cx } from '@/shared/lib/cx';
import { Button } from '@/shared/ui/Button/Button';
import { useTranslation } from 'react-i18next';
import styles from './BookList.module.css';
import { ProductCard } from './ProductCard';

interface BookListProps {
  books: readonly BookCardData[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  /**
   * - row: swipes sideways on mobile, 3 / 4 / 6 columns from 768 / 1024 / 1280.
   * - grid: 2 / 3 / 4 columns (listing pages).
   */
  layout?: 'row' | 'grid' | 'gridNarrow';
  skeletonCount?: number;
  emptyText?: string;
  matches?: ReadonlyMap<number, number | null>;
}

const ROW_SIZES = '(max-width: 767px) 160px, 220px';

export function BookList({
  books,
  isLoading,
  isError,
  onRetry,
  layout = 'row',
  skeletonCount = 6,
  emptyText,
  matches,
}: BookListProps) {
  const { t } = useTranslation('catalog', { keyPrefix: 'list' });
  const { t: tc } = useTranslation();

  if (isError && !books) {
    return (
      <div className={styles.message} role="alert">
        <p>{t('error')}</p>
        <Button variant="ghost" size="sm" onClick={onRetry}>
          {tc('ui.retry')}
        </Button>
      </div>
    );
  }

  if (isLoading || !books) {
    return (
      <ul className={cx(styles.list, styles[layout])} aria-busy="true" aria-label={tc('loading')}>
        {Array.from({ length: skeletonCount }, (_, index) => (
          <li key={index} className={styles.item}>
            <div className={styles.skeleton} aria-hidden="true">
              <span className={styles.skCover} />
              <span className={styles.skLine} />
              <span className={cx(styles.skLine, styles.skShort)} />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (books.length === 0) {
    return <p className={styles.message}>{emptyText ?? t('empty')}</p>;
  }

  return (
    <ul className={cx(styles.list, styles[layout])}>
      {books.map((book, index) => (
        <li key={book.id} className={styles.item}>
          <ProductCard
            book={book}
            match={matches?.get(book.id) ?? null}
            imageSizes={layout === 'row' ? ROW_SIZES : undefined}
            priority={index < 2}
          />
        </li>
      ))}
    </ul>
  );
}