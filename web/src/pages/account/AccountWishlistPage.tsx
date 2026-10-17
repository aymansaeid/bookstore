import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { AccountHeader } from '@/features/account/components/AccountHeader';
import shared from '@/features/account/components/account.module.css';
import { addToCartWithFeedback } from '@/features/catalog/addToCart';
import { BookCover } from '@/features/catalog/components/BookCover';
import type { WishlistItem } from '@/features/wishlist/api';
import { useToggleWishlist, useWishlist } from '@/features/wishlist/queries';
import { errorMessage } from '@/shared/api/errorMessages';
import { formatDate, formatMoney } from '@/shared/lib/format';
import { Button, ButtonLink } from '@/shared/ui/Button/Button';
import { Icon } from '@/shared/ui/Icon/Icon';

import styles from './AccountCollections.module.css';

const asCard = (item: WishlistItem) => ({
  id: item.bookId,
  slug: item.slug,
  title: item.title,
  author: item.author,
  editionLabel: null,
  volumes: null,
  price: item.price,
  oldPrice: null,
  currency: item.currency,
  inStock: item.inStock,
  coverImageUrl: item.coverImageUrl,
  averageRating: null,
  reviewCount: 0,
});

/** «المفضلة» (API §8): saved books with the live price and stock. */
export default function AccountWishlistPage() {
  const wishlist = useWishlist();
  const toggle = useToggleWishlist();

  return (
    <>
      <AccountHeader title="المفضلة" description="الكتب التي حفظتها لوقت لاحق." />
      {wishlist.isError ? (
        <div className={shared.empty} role="alert">
          <p>{errorMessage(wishlist.error)}</p>
        </div>
      ) : !wishlist.data ? (
        <div className={shared.skeleton} aria-busy="true" aria-label="جارٍ تحميل المفضلة" />
      ) : wishlist.data.length === 0 ? (
        <div className={shared.empty}>
          <Icon name="heart" size={28} />
          <p>لم تحفظ أي كتاب بعد. اضغط ♡ على أي كتاب لحفظه هنا.</p>
          <ButtonLink to={paths.search} variant="ink" size="sm">
            تصفّح المكتبة
          </ButtonLink>
        </div>
      ) : (
        <ul className={styles.grid}>
          {wishlist.data.map((item) => (
            <li key={item.bookId} className={styles.item}>
              <Link to={paths.book(item.slug)} className={styles.cover} aria-label={item.title}>
                <BookCover
                  title={item.title}
                  src={item.coverThumbnailUrl ?? item.coverImageUrl}
                  sizes="96px"
                />
              </Link>
              <div className={styles.body}>
                <Link to={paths.book(item.slug)} className={styles.title}>
                  {item.title}
                </Link>
                <span className={styles.sub}>{item.author}</span>
                <span className={styles.price}>{formatMoney(item.price, item.currency)}</span>
                {!item.inStock && <span className={styles.out}>غير متوفر حالياً</span>}
                <span className={styles.sub}>حُفظ في {formatDate(item.addedAtUtc)}</span>
                <div className={styles.actions}>
                  {item.inStock && (
                    <Button
                      variant="ink"
                      size="sm"
                      onClick={() => {
                        addToCartWithFeedback({ id: item.bookId, title: item.title });
                      }}
                    >
                      <Icon name="cart" size={16} /> أضف إلى السلة
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={toggle.isPending}
                    onClick={() => {
                      toggle.mutate({ book: asCard(item), saved: true });
                    }}
                  >
                    إزالة
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
