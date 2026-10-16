import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { useSession } from '@/features/auth/session';
import { useCartStore, MAX_QUANTITY } from '@/features/cart/cartStore';
import type { BookCardData } from '@/features/catalog/types';
import type { QuoteLine } from '@/features/checkout/types';
import { useToggleWishlist, useWishlistIds } from '@/features/wishlist/queries';
import { cx } from '@/shared/lib/cx';
import { formatMoney } from '@/shared/lib/format';
import { Icon } from '@/shared/ui/Icon/Icon';
import { QuantityStepper } from '@/shared/ui/QuantityStepper/QuantityStepper';

import styles from './CartLineItem.module.css';

const asCard = (line: QuoteLine, currency: string): BookCardData => ({
  id: line.bookId,
  slug: line.slug,
  title: line.title,
  author: '',
  editionLabel: null,
  volumes: null,
  price: line.unitPrice,
  oldPrice: line.oldPrice,
  currency,
  inStock: line.available,
  coverImageUrl: line.coverImageUrl,
  averageRating: null,
  reviewCount: 0,
});

interface CartLineItemProps {
  line: QuoteLine;
  /** The cart's own quantity: changes show instantly while the quote catches up. */
  quantity: number;
  currency: string;
}

export function CartLineItem({ line, quantity, currency }: CartLineItemProps) {
  const setQuantity = useCartStore((state) => state.setQuantity);
  const remove = useCartStore((state) => state.remove);
  const { status } = useSession();
  const saved = useWishlistIds().has(line.bookId);
  const toggleWishlist = useToggleWishlist();
  const href = paths.book(line.slug);

  return (
    <li className={cx(styles.item, !line.available && styles.unavailable)}>
      <Link to={href} className={styles.cover} tabIndex={-1} aria-hidden="true">
        {(line.coverThumbnailUrl ?? line.coverImageUrl) && (
          <img
            src={line.coverThumbnailUrl ?? line.coverImageUrl ?? ''}
            alt=""
            width={80}
            height={118}
            loading="lazy"
          />
        )}
      </Link>

      <div className={styles.info}>
        <h3 className={styles.title}>
          <Link to={href}>{line.title}</Link>
        </h3>
        <p className={styles.unit}>
          {formatMoney(line.unitPrice, currency)}
          {line.oldPrice !== null && <s>{formatMoney(line.oldPrice, currency)}</s>}
        </p>
        {!line.available && (
          <p className={styles.warning} role="alert">
            الكمية المطلوبة غير متوفرة حالياً. قلّل الكمية أو احذف الكتاب.
          </p>
        )}
        <div className={styles.links}>
          {status === 'authenticated' && (
            <button
              type="button"
              className={styles.link}
              disabled={toggleWishlist.isPending}
              onClick={() => {
                if (saved) {
                  remove(line.bookId);
                  return;
                }
                toggleWishlist.mutate(
                  { book: asCard(line, currency), saved: false },
                  {
                    onSuccess: () => {
                      remove(line.bookId);
                    },
                  },
                );
              }}
            >
              <Icon name="heart" size={16} /> نقل إلى المفضلة
            </button>
          )}
          <button
            type="button"
            className={styles.link}
            onClick={() => {
              remove(line.bookId);
            }}
          >
            <Icon name="x" size={16} /> حذف
          </button>
        </div>
      </div>

      <div className={styles.side}>
        <QuantityStepper
          value={quantity}
          max={MAX_QUANTITY}
          label={`كمية «${line.title}»`}
          onChange={(value) => {
            setQuantity(line.bookId, value);
          }}
        />
        <p className={styles.total}>{formatMoney(line.lineTotal, currency)}</p>
      </div>
    </li>
  );
}
