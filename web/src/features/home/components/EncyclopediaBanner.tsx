import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { addToCartWithFeedback } from '@/features/catalog/addToCart';
import { BookCover } from '@/features/catalog/components/BookCover';
import { useCatalogSearch } from '@/features/catalog/queries';
import { formatCount, formatMoney, volumesLabel } from '@/shared/lib/format';
import { Button, ButtonLink } from '@/shared/ui/Button/Button';

import styles from './EncyclopediaBanner.module.css';

const MAX_SPINES = 18;

/**
 * Spec 5.1 §5: the encyclopedia banner. Shows the best-selling multi-volume
 * set (10+ volumes) from the catalog; hidden when there is none.
 */
export function EncyclopediaBanner() {
  const query = useCatalogSearch({ sort: 'Bestselling', minVolumes: 10, pageSize: 1 });
  const book = query.data?.results.items[0];
  if (!book) return null;

  const volumes = book.volumes ?? 0;
  const muhaqqiq = book.muhaqqiqs[0]?.name ?? null;
  const facts: { value: string; label: string }[] = [];
  if (volumes > 0) facts.push({ value: formatCount(volumes), label: 'مجلداً' });
  if (muhaqqiq) facts.push({ value: muhaqqiq, label: 'التحقيق' });
  if (book.pageCount > 0) facts.push({ value: formatCount(book.pageCount), label: 'صفحة' });

  return (
    <section className={`wrap ${styles.wrap}`} aria-labelledby="encyclopedia-title">
      <div className={styles.banner}>
        <div className={styles.copy}>
          <p className={styles.kicker}>الموسوعات الكاملة</p>
          <h2 id="encyclopedia-title" className={styles.title}>
            <Link to={paths.book(book.slug)}>{book.title}</Link>
          </h2>
          <p className={styles.subtitle}>
            {book.editionLabel ?? (volumes > 1 ? `الطبعة الكاملة، ${volumesLabel(volumes)}` : '')}
          </p>
          {book.description && <p className={styles.description}>{book.description}</p>}
          {facts.length > 0 && (
            <dl className={styles.facts}>
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dd>{fact.value}</dd>
                  <dt>{fact.label}</dt>
                </div>
              ))}
            </dl>
          )}
          <div className={styles.buy}>
            <p className={styles.price}>
              {formatMoney(book.price, book.currency)}
              {book.oldPrice !== null && (
                <s className={styles.old}>{formatMoney(book.oldPrice, book.currency)}</s>
              )}
            </p>
            <div className={styles.actions}>
              {book.inStock ? (
                <Button
                  variant="gold"
                  onClick={() => {
                    addToCartWithFeedback(book);
                  }}
                >
                  اطلب المجموعة
                </Button>
              ) : (
                <span className={styles.out}>غير متوفرة حالياً</span>
              )}
              <ButtonLink to={paths.book(book.slug)} variant="glass">
                تفاصيل المجموعة
              </ButtonLink>
            </div>
          </div>
        </div>

        <div className={styles.shelf} aria-hidden="true">
          <div className={styles.spines}>
            {Array.from({ length: Math.min(Math.max(volumes, 6), MAX_SPINES) }, (_, index) => (
              <span key={index}>{formatCount(index + 1)}</span>
            ))}
          </div>
          <div className={styles.cover}>
            <BookCover
              title={book.title}
              src={book.coverImageUrl}
              srcSet={book.coverImageSrcSet}
              sizes="160px"
            />
          </div>
          <div className={styles.plank} />
        </div>
      </div>
    </section>
  );
}
