import { useState } from 'react';

import { BookCover } from '@/features/catalog/components/BookCover';
import type { PublicBook } from '@/features/catalog/types';
import { WishlistButton } from '@/features/wishlist/WishlistButton';
import { cx } from '@/shared/lib/cx';
import { formatCount } from '@/shared/lib/format';
import { Icon } from '@/shared/ui/Icon/Icon';
import { toast } from '@/shared/ui/toast/toastStore';

import styles from './BookGallery.module.css';

async function share(title: string) {
  const url = window.location.href;
  try {
    // 1. Replaced the `in` operator with a truthiness/type check
    if (typeof navigator.share === 'function') {
      await navigator.share({ title, url });
    } else {
      // 2. TypeScript no longer considers this block unreachable
      await navigator.clipboard.writeText(url);
      toast.success('نُسخ رابط الكتاب');
    }
  } catch {
    // The user closed the share sheet: nothing to report.
  }
}

/** Spec 5.4 stage: big cover on a patterned paper stage, badges, tools, thumbnails. */
export function BookGallery({ book }: { book: PublicBook }) {
  const images = [...book.images].sort(
    (a, b) => Number(b.isCover) - Number(a.isCover) || a.displayOrder - b.displayOrder,
  );
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  return (
    <div className={styles.gallery}>
      <div className={styles.stage}>
        <div className={styles.badges}>
          {(book.savingsPercent ?? 0) > 0 && (
            <span className={styles.sale}>وفّر {formatCount(book.savingsPercent ?? 0)}٪</span>
          )}
          {book.badges.includes('Bestseller') && <span className={styles.best}>الأكثر مبيعاً</span>}
          {book.badges.includes('New') && <span className={styles.new}>جديد</span>}
        </div>

        <div className={styles.tools}>
          <WishlistButton book={book} />
          <button
            type="button"
            className={styles.tool}
            aria-label="مشاركة الكتاب"
            onClick={() => {
              void share(book.title);
            }}
          >
            <span>
              <Icon name="send" size={17} />
            </span>
          </button>
        </div>

        <BookCover
          className={styles.cover}
          title={book.title}
          src={current?.url ?? book.coverImageUrl}
          srcSet={current?.srcSet ?? book.coverImageSrcSet}
          sizes="(max-width: 768px) 70vw, 340px"
          priority
        />
      </div>

      {images.length > 1 && (
        <ul className={styles.thumbs} aria-label="صور الكتاب">
          {images.map((image, index) => (
            <li key={image.id}>
              <button
                type="button"
                className={cx(styles.thumb, index === active && styles.thumbActive)}
                aria-label={image.altText ?? `الصورة ${formatCount(index + 1)}`}
                aria-pressed={index === active}
                onClick={() => {
                  setActive(index);
                }}
              >
                <img
                  src={image.variants[0]?.url ?? image.url}
                  alt=""
                  width={64}
                  height={88}
                  loading="lazy"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
