import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { paths } from '@/app/paths';
import styles from '@/features/admin/components/admin.module.css';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import type { AdminBook } from '@/features/admin/books/api';
import { useAdminBooks } from '@/features/admin/books/queries';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { booksPhrase, formatCount, formatMoney } from '@/shared/lib/format';
import { ButtonLink, Button } from '@/shared/ui/Button/Button';
import { StatusBadge } from '@/shared/ui/StatusBadge/StatusBadge';
import { arabicFold as fold } from '@/shared/lib/arabicFold';

import local from './AdminBooksPage.module.css';

type Filter = 'all' | 'visible' | 'hidden' | 'low' | 'out';

const FILTERS: { id: Filter; label: string; test: (book: AdminBook) => boolean }[] = [
  { id: 'all', label: 'الكل', test: () => true },
  { id: 'visible', label: 'ظاهرة', test: (book) => book.isActive },
  { id: 'hidden', label: 'مخفية', test: (book) => !book.isActive },
  { id: 'low', label: 'مخزون منخفض', test: (book) => book.isLowStock && book.availableToSell > 0 },
  { id: 'out', label: 'نفدت', test: (book) => book.availableToSell === 0 },
];



/** Books (API §10): every book, hidden ones too, with exact stock. Filtered here. */
export default function AdminBooksPage() {
  const [params, setParams] = useSearchParams();
  const books = useAdminBooks();
  const rawFilter = params.get('filter');
  const filter = FILTERS.find((item) => item.id === rawFilter) ?? FILTERS[0];
  const [query, setQuery] = useState(params.get('q') ?? '');
  const term = fold(query.trim());

  const shown = (books.data ?? [])
    .filter((book) => filter?.test(book) ?? true)
    .filter(
      (book) =>
        term === '' ||
        fold(`${book.title} ${book.author} ${book.isbn} ${book.slug}`).includes(term),
    )
    .sort((a, b) => a.title.localeCompare(b.title, 'ar'));

  return (
    <>
      <AdminPageHeader
        title="الكتب والطبعات"
        meta={books.data ? <span>{booksPhrase(books.data.length)}</span> : undefined}
        actions={
          <ButtonLink to={paths.admin.newBook} variant="ink" size="sm">
            + كتاب جديد
          </ButtonLink>
        }
      />

      <div className={styles.toolbar}>
        <div className={styles.filters} role="group" aria-label="تصفية">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cx(styles.filter, filter?.id === item.id && styles.filterOn)}
              aria-pressed={filter?.id === item.id}
              onClick={() => {
                const next = new URLSearchParams(params);
                if (item.id === 'all') next.delete('filter');
                else next.set('filter', item.id);
                setParams(next, { replace: true });
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className={styles.search} role="search">
          <label htmlFor="book-search" className="sr-only">
            ابحث بالعنوان أو المؤلف أو ISBN
          </label>
          <input
            id="book-search"
            type="search"
            dir="auto"
            placeholder="العنوان أو المؤلف أو ISBN"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
          />
        </div>
      </div>

      {books.isError && !books.data ? (
        <div className={styles.empty} role="alert">
          <p>{errorMessage(books.error)}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void books.refetch();
            }}
          >
            أعد المحاولة
          </Button>
        </div>
      ) : !books.data ? (
        <div className={styles.skeleton} aria-busy="true" aria-label="جارٍ تحميل الكتب" />
      ) : shown.length === 0 ? (
        <div className={styles.empty}>
          <p>{books.data.length === 0 ? 'لا كتب بعد. أضف أول كتاب.' : 'لا كتب تطابق البحث.'}</p>
        </div>
      ) : (
        <div className={styles.card}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">الكتاب</th>
                <th scope="col">السعر</th>
                <th scope="col">متاح / في المستودع</th>
                <th scope="col">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((book) => {
                const cover = book.images.find((image) => image.isCover) ?? book.images[0];
                return (
                  <tr key={book.id}>
                    <td data-label="الكتاب">
                      <span className={local.book}>
                        <span className={local.thumb} aria-hidden="true">
                          {cover && <img src={cover.url} alt="" loading="lazy" />}
                        </span>
                        <span className={local.bookText}>
                          <Link to={paths.admin.book(book.id)} className={styles.rowLink}>
                            {book.title}
                          </Link>
                          <span className={styles.sub}>
                            {book.author}
                            {book.editionLabel && ` · ${book.editionLabel}`}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td data-label="السعر" className={styles.num}>
                      {formatMoney(book.price, book.currency)}
                      {book.compareAtPrice !== null && (
                        <s className={styles.sub}>
                          {formatMoney(book.compareAtPrice, book.currency)}
                        </s>
                      )}
                    </td>
                    <td data-label="متاح / في المستودع" className={styles.num}>
                      <b
                        className={
                          book.availableToSell === 0
                            ? local.out
                            : book.isLowStock
                              ? local.low
                              : undefined
                        }
                      >
                        {formatCount(book.availableToSell)}
                      </b>{' '}
                      / {formatCount(book.stockQuantity)}
                    </td>
                    <td data-label="الحالة">
                      <StatusBadge
                        label={book.isActive ? 'ظاهر' : 'مخفي'}
                        tone={book.isActive ? 'green' : 'gray'}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}