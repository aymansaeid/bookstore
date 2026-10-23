import { useSearchParams } from 'react-router';

import { useAdminBooks } from '@/features/admin/books/queries';
import styles from '@/features/admin/components/admin.module.css';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { ReviewCard } from '@/features/admin/reviews/components/ReviewCard';
import { REVIEW_FILTERS, reviewFilterFrom } from '@/features/admin/reviews/labels';
import { useAdminReviews } from '@/features/admin/reviews/queries';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { arabicPlural } from '@/shared/lib/format';
import { usePageParam } from '@/shared/lib/usePageParam';
import { Button } from '@/shared/ui/Button/Button';
import { Pagination } from '@/shared/ui/Pagination/Pagination';

import local from './AdminReviewsPage.module.css';

const reviewsPhrase = (count: number) =>
  arabicPlural(count, { one: 'مراجعة واحدة', two: 'مراجعتان', few: 'مراجعات', many: 'مراجعة' });

/** Review moderation (API §10): the queue opens on what's waiting, oldest first. */
export default function AdminReviewsPage() {
  const [params, setParams] = useSearchParams();
  const { page, hrefFor } = usePageParam();
  const status = reviewFilterFrom(params.get('status'));
  const rawBook = params.get('book');
  const bookId = rawBook !== null && /^\d+$/.test(rawBook) ? Number(rawBook) : null;
  const reviews = useAdminReviews(status, bookId, page);
  const books = useAdminBooks();
  const data = reviews.data;

  /** Changing a filter goes back to page 1. */
  const setFilter = (key: 'status' | 'book', value: string | null) => {
    const next = new URLSearchParams(params);
    next.delete('page');
    if (value === null) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  return (
    <>
      <AdminPageHeader
        title="المراجعات"
        meta={
          data ? (
            <span>
              {data.totalCount === 0 ? 'لا مراجعات' : reviewsPhrase(data.totalCount)}
              {status === 'Pending' && ' · الأقدم أولاً'}
            </span>
          ) : undefined
        }
      />

      <div className={styles.toolbar}>
        <div className={styles.filters} role="group" aria-label="الحالة">
          {REVIEW_FILTERS.map((filter) => (
            <button
              key={filter.label}
              type="button"
              className={cx(styles.filter, status === filter.status && styles.filterOn)}
              aria-pressed={status === filter.status}
              onClick={() => {
                setFilter('status', filter.status === 'Pending' ? null : (filter.status ?? 'all'));
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className={local.bookFilter}>
          <label htmlFor="review-book" className="sr-only">
            الكتاب
          </label>
          <select
            id="review-book"
            className={local.select}
            value={bookId === null ? '' : String(bookId)}
            onChange={(event) => {
              setFilter('book', event.target.value === '' ? null : event.target.value);
            }}
          >
            <option value="">كل الكتب</option>
            {[...(books.data ?? [])]
              .sort((a, b) => a.title.localeCompare(b.title, 'ar'))
              .map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title}
                  {book.editionLabel ? ` — ${book.editionLabel}` : ''}
                </option>
              ))}
          </select>
        </div>
      </div>

      {reviews.isError && !data ? (
        <div className={styles.empty} role="alert">
          <p>{errorMessage(reviews.error)}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void reviews.refetch();
            }}
          >
            أعد المحاولة
          </Button>
        </div>
      ) : !data ? (
        <div className={styles.skeleton} aria-busy="true" aria-label="جارٍ تحميل المراجعات" />
      ) : data.items.length === 0 ? (
        <div className={styles.empty}>
          <p>{status === 'Pending' ? 'لا مراجعات بانتظار المراجعة.' : 'لا مراجعات بهذه الحالة.'}</p>
        </div>
      ) : (
        <>
          <div className={cx(local.list, reviews.isPlaceholderData && styles.stale)}>
            {data.items.map((review) => (
              <ReviewCard key={`${String(review.id)}-${review.status}`} review={review} />
            ))}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} hrefFor={hrefFor} />
        </>
      )}
    </>
  );
}