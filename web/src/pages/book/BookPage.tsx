import { Link, useParams } from 'react-router';

import { paths } from '@/app/paths';
import { BookAbout, BookSpecs } from '@/features/book/components/BookDetails';
import { BookGallery } from '@/features/book/components/BookGallery';
import { BookPurchase, MobileBuyBar } from '@/features/book/components/BookPurchase';
import { BookReviews } from '@/features/book/components/BookReviews';
import { useBook } from '@/features/book/queries';
import { BookList } from '@/features/catalog/components/BookList';
import type { PublicBook } from '@/features/catalog/types';
import NotFoundPage from '@/pages/not-found/NotFoundPage';
import { isApiError } from '@/shared/api/ApiError';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { formatAmount, formatCount } from '@/shared/lib/format';
import { Breadcrumbs, type Crumb } from '@/shared/ui/Breadcrumbs/Breadcrumbs';
import { Button } from '@/shared/ui/Button/Button';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';
import { SectionHeader } from '@/shared/ui/SectionHeader/SectionHeader';

import styles from './BookPage.module.css';

/** Show «● N نسخة بيعت هذا الأسبوع» only above this (API §7b). */
const SOLD_THRESHOLD = 5;

function crumbs(book: PublicBook): Crumb[] {
  const items: Crumb[] = [{ label: 'الرئيسية', to: paths.home }];
  if (book.category?.parent) {
    items.push({ label: book.category.parent.name, to: paths.category(book.category.parent.slug) });
  }
  if (book.category) {
    items.push({ label: book.category.name, to: paths.category(book.category.slug) });
  }
  items.push({ label: book.title });
  return items;
}

function BookHeading({ book }: { book: PublicBook }) {
  const sold = book.soldLast7Days ?? 0;
  return (
    <header className={styles.heading}>
      <p className={styles.kicker}>
        {[book.category?.name, book.publisher].filter(Boolean).join(' · ')}
      </p>
      <h1 className={styles.title}>{book.title}</h1>
      {book.subtitle && <p className={styles.subtitle}>{book.subtitle}</p>}
      <p className={styles.people}>
        تأليف: <b>{book.author}</b>
        {book.muhaqqiqs.length > 0 && (
          <>
            {' · '}تحقيق:{' '}
            {book.muhaqqiqs.map((muhaqqiq, index) => (
              <span key={muhaqqiq.id}>
                {index > 0 && '، '}
                <Link to={paths.muhaqqiq(muhaqqiq.slug)} className={styles.personLink}>
                  {muhaqqiq.name}
                </Link>
              </span>
            ))}
          </>
        )}
      </p>
      <p className={styles.signals}>
        {book.averageRating !== null && book.reviewCount > 0 && (
          <a href="#reviews" className={styles.rating}>
            <b aria-hidden="true">★</b> {formatAmount(book.averageRating)}
            <span>({formatCount(book.reviewCount)} مراجعة)</span>
          </a>
        )}
        {sold >= SOLD_THRESHOLD && (
          <span className={styles.sold}>● {formatCount(sold)} نسخة بيعت هذا الأسبوع</span>
        )}
      </p>
    </header>
  );
}

export default function BookPage() {
  const { slug = '' } = useParams();
  const query = useBook(slug);

  if (query.isPending) {
    return (
      <div className={cx('wrap', styles.loading)} role="status">
        جارٍ تحميل الكتاب…
      </div>
    );
  }

  if (query.isError) {
    if (isApiError(query.error) && query.error.status === 404) return <NotFoundPage />;
    return (
      <div className={cx('wrap', styles.loading)} role="alert">
        <p>{errorMessage(query.error)}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            void query.refetch();
          }}
        >
          أعد المحاولة
        </Button>
      </div>
    );
  }

  const book = query.data;

  return (
    <div className={styles.page}>
      <DocumentTitle title={book.title} />
      <div className="wrap">
        <Breadcrumbs items={crumbs(book)} />

        {/* key: switching edition resets gallery index and quantity */}
        <div className={styles.top} key={book.id}>
          <BookGallery book={book} />
          <div className={styles.info}>
            <BookHeading book={book} />
            <BookPurchase book={book} />
          </div>
        </div>

        <div className={styles.block}>
          <BookSpecs book={book} />
        </div>
        <div className={styles.block}>
          <BookAbout book={book} />
        </div>
        <div className={styles.block}>
          <BookReviews bookId={book.id} />
        </div>

        {book.related && book.related.length > 0 && (
          <section className={styles.block} aria-labelledby="related-title">
            <SectionHeader id="related-title" kicker="مختارة بعناية" title="يُكمل مكتبتك" />
            <BookList
              books={book.related}
              isLoading={false}
              isError={false}
              onRetry={() => undefined}
            />
          </section>
        )}
      </div>

      <MobileBuyBar book={book} />
    </div>
  );
}
