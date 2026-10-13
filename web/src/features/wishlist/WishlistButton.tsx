import { useLocation, useNavigate } from 'react-router';

import { paths } from '@/app/paths';
import { useSession } from '@/features/auth/session';
import type { BookCardData } from '@/features/catalog/types';
import { cx } from '@/shared/lib/cx';
import { Icon } from '@/shared/ui/Icon/Icon';

import { useToggleWishlist, useWishlistIds } from './queries';
import styles from './WishlistButton.module.css';

/** Heart toggle (API §8). Guests are sent to login and come back to this page. */
export function WishlistButton({ book, className }: { book: BookCardData; className?: string }) {
  const { status } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const saved = useWishlistIds().has(book.id);
  const toggle = useToggleWishlist();
  const signedIn = status === 'authenticated';

  return (
    <button
      type="button"
      className={cx(styles.button, saved && styles.saved, className)}
      aria-pressed={signedIn ? saved : undefined}
      aria-label={saved ? `أزل «${book.title}» من المفضلة` : `أضف «${book.title}» إلى المفضلة`}
      disabled={toggle.isPending}
      onClick={() => {
        if (!signedIn) {
          void navigate(paths.loginWithReturn(location.pathname + location.search));
          return;
        }
        toggle.mutate({ book, saved });
      }}
    >
      <span className={styles.circle}>
        <Icon name="heart" size={17} />
      </span>
    </button>
  );
}
