import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { useCustomerId } from '@/features/account/queries';
import { useCartStore } from '@/features/cart/cartStore';
import { BookCover } from '@/features/catalog/components/BookCover';
import { useQuote } from '@/features/checkout/useQuote';
import { useLibrary } from '@/features/library/queries';
import { ownershipLabel, readingStatusLabel } from '@/shared/api/enums';
import { booksPhrase, formatCount, formatMoney, formatPercent } from '@/shared/lib/format';
import { buttonClass } from '@/shared/ui/Button/buttonClass';

import styles from './Panels.module.css';

/** «من مكتبتك» (spec 5.2): the three most recent books. Hidden for guests and empty libraries. */
export function LibraryPeek() {
  const { t } = useTranslation('efendi', { keyPrefix: 'panels' });
  const customerId = useCustomerId();
  const library = useLibrary();
  const items = library.data?.items.slice(0, 3) ?? [];
  if (customerId === null || items.length === 0) return null;

  return (
    <section className={styles.panel} aria-labelledby="library-peek-title">
      <div className={styles.titleRow}>
        <h2 id="library-peek-title" className={styles.title}>
          {t('library')}
        </h2>
        <Link to={paths.account.library} className={styles.more}>
          {t('myLibrary')}
        </Link>
      </div>
      <ul className={styles.card}>
        {items.map((item) => (
          <li key={item.book.id} className={styles.mini}>
            <BookCover title={item.book.title} src={item.book.coverImageUrl} sizes="40px" />
            <div className={styles.miniBody}>
              <Link to={paths.book(item.book.slug)} className={styles.miniTitle}>
                {item.book.title}
              </Link>
              <span className={styles.miniSub}>
                {item.readingStatus === 'Reading'
                  ? t('reading', { percent: formatPercent(item.progressPercent) })
                  : item.readingStatus === 'Finished'
                    ? readingStatusLabel('Finished')
                    : ownershipLabel(item.ownership)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** «سلتك الآن» (spec 5.2): the dark cart card. Server totals only, from the quote. */
export function CartPeek() {
  const { t } = useTranslation('efendi', { keyPrefix: 'panels' });
  const lineCount = useCartStore((state) => state.lines.length);
  const quote = useQuote();
  const data = quote.data;
  const first = data?.lines[0];
  if (lineCount === 0 || !data || !first) return null;

  return (
    <section className={styles.cart} aria-labelledby="cart-peek-title">
      <h2 id="cart-peek-title" className={styles.cartTitle}>
        {t('cart')}
      </h2>
      <div className={styles.mini}>
        <BookCover
          title={first.title}
          src={first.coverThumbnailUrl ?? first.coverImageUrl}
          sizes="40px"
        />
        <div className={styles.miniBody}>
          <span className={styles.miniTitle}>{first.title}</span>
          <span className={styles.cartSub}>
            {data.lines.length > 1
              ? t('more', { books: booksPhrase(data.lines.length - 1) })
              : `${formatCount(first.quantity)} × ${formatMoney(first.unitPrice, data.currency)}`}
          </span>
        </div>
      </div>
      <p className={styles.cartTotal}>
        <span>{t('total')}</span>
        <b>{formatMoney(data.total, data.currency)}</b>
      </p>
      <Link
        to={data.canCheckout ? paths.checkout : paths.cart}
        className={buttonClass('red', 'md', styles.cartButton)}
      >
        {data.canCheckout ? t('checkout') : t('viewCart')}
      </Link>
    </section>
  );
}