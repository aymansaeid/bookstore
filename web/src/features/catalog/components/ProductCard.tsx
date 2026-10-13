import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { addToCartWithFeedback } from '@/features/catalog/addToCart';
import type { BookCardData } from '@/features/catalog/types';
import { WishlistButton } from '@/features/wishlist/WishlistButton';
import { formatAmount, formatCount, formatMoney, volumesLabel } from '@/shared/lib/format';
import { Icon } from '@/shared/ui/Icon/Icon';
import { Spark } from '@/shared/ui/Spark/Spark';

import { BookCover } from './BookCover';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  book: BookCardData;
  /** AI match percentage (shown only on personalised picks). */
  match?: number | null;
  /** API guide §4e: grid cards. Rows pass a narrower value on mobile. */
  imageSizes?: string;
  priority?: boolean;
}

export function ProductCard({
  book,
  match = null,
  imageSizes = '(max-width: 767px) 45vw, 220px',
  priority = false,
}: ProductCardProps) {
  const href = paths.book(book.slug);
  const badges = book.badges ?? [];
  const discount = book.savingsPercent ?? null;
  const edition =
    book.editionLabel ?? (book.volumes && book.volumes > 1 ? volumesLabel(book.volumes) : null);
  const publisher = book.publisher ?? null;

  return (
    <article className={styles.card}>
      <div className={styles.media}>
        <BookCover
          title={book.title}
          src={book.coverImageUrl}
          srcSet={book.coverImageSrcSet}
          sizes={imageSizes}
          priority={priority}
          className={styles.cover}
        />

        <div className={styles.tags}>
          {discount !== null && discount > 0 && (
            <span className={styles.sale}>-{formatCount(discount)}٪</span>
          )}
          {badges.includes('New') && <span className={styles.new}>جديد</span>}
          {badges.includes('Deluxe') && <span className={styles.deluxe}>طبعة فاخرة</span>}
        </div>

        <WishlistButton book={book} className={styles.fav} />

        {match !== null && (
          <span className={styles.match}>
            <Spark size={12} />
            تطابق {formatCount(match)}٪
          </span>
        )}
      </div>

      <div className={styles.meta}>
        {book.category && <span className={styles.category}>{book.category.name}</span>}
        <h3 className={styles.title}>
          {/* Stretched link: the whole card opens the book; buttons sit above it. */}
          <Link to={href} className={styles.titleLink}>
            {book.title}
          </Link>
        </h3>
        <p className={styles.author}>{book.author}</p>
        {(edition ?? publisher) && (
          <p className={styles.edition}>
            {edition}
            {edition && publisher && <i aria-hidden="true" />}
            {publisher}
          </p>
        )}

        <div className={styles.footer}>
          <div className={styles.priceBlock}>
            {book.averageRating !== null && book.reviewCount > 0 && (
              <p className={styles.rating}>
                <b aria-hidden="true">★</b>
                <span className="sr-only">التقييم</span>
                {formatAmount(book.averageRating)}
                <span>({formatCount(book.reviewCount)})</span>
              </p>
            )}
            <p className={styles.price}>
              {book.currency === 'TRY' ? (
                <>
                  {formatAmount(book.price)}
                  <small>₺</small>
                </>
              ) : (
                formatMoney(book.price, book.currency)
              )}
              {book.oldPrice !== null && (
                <s className={styles.old}>
                  <span className="sr-only">بدلاً من </span>
                  {formatAmount(book.oldPrice)}
                </s>
              )}
            </p>
            {!book.inStock && <p className={styles.soldOut}>غير متوفر حالياً</p>}
          </div>

          {book.inStock ? (
            <button
              type="button"
              className={styles.add}
              aria-label={`أضف «${book.title}» إلى السلة`}
              onClick={() => {
                addToCartWithFeedback(book);
              }}
            >
              <Icon name="cart" size={18} />
            </button>
          ) : (
            <Link
              to={href}
              className={styles.add}
              aria-label={`«${book.title}» غير متوفر: نبّهني عند توفّره`}
            >
              <Icon name="bell" size={18} />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
