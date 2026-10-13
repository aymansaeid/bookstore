import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';

import { activeNavId } from '@/app/navigation';
import { paths } from '@/app/paths';
import { meKeys } from '@/features/account/queries';
import { cx } from '@/shared/lib/cx';
import { formatCount } from '@/shared/lib/format';
import { CountBadge } from '@/shared/ui/CountBadge/CountBadge';
import { Icon } from '@/shared/ui/Icon/Icon';
import { Logo } from '@/shared/ui/Logo/Logo';

import { AccountPill } from './AccountPill';
import { HeaderSearch } from './HeaderSearch';
import { MobileDrawer } from './MobileDrawer';
import { PrimaryNav } from './PrimaryNav';
import styles from './SiteHeader.module.css';
import { useHeaderCounts } from './useHeaderCounts';

const withCount = (label: string, count: number) =>
  count > 0 ? `${label} (${formatCount(count)})` : label;

/** API guide §7c: re-check the bell on every page navigation (not on first render). */
function useRefreshUnreadOnNavigation(pathname: string) {
  const queryClient = useQueryClient();
  const previous = useRef(pathname);
  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    void queryClient.invalidateQueries({ queryKey: meKeys.unreadCountAll });
  }, [pathname, queryClient]);
}

/** Spec §4.1 layer 2 (layer 1 is AnnouncementBar). Sticky, frosted. */
export function SiteHeader() {
  const { pathname, search } = useLocation();
  const active = activeNavId(pathname, search);
  const counts = useHeaderCounts();
  const drawerRef = useRef<HTMLDialogElement>(null);
  useRefreshUnreadOnNavigation(pathname);

  return (
    <header className={styles.root}>
      <div className={cx('wrap', styles.bar)}>
        <button
          type="button"
          className={styles.menuButton}
          aria-label="القائمة"
          aria-haspopup="dialog"
          onClick={() => {
            drawerRef.current?.showModal();
          }}
        >
          <Icon name="menu" size={24} />
        </button>

        <Link to={paths.home} className={styles.logo}>
          <Logo className={styles.logoImg} alt="كتاب أفندي، الصفحة الرئيسية" priority />
        </Link>

        <PrimaryNav active={active} label="التنقّل الرئيسي" className={styles.nav} />

        <HeaderSearch className={styles.search} />

        <div className={styles.actions}>
          <Link
            to={paths.account.notifications}
            className={cx(styles.iconLink, styles.mobileOnly)}
            aria-label={withCount('التنبيهات', counts.notifications)}
          >
            <Icon name="bell" />
            <CountBadge count={counts.notifications} />
          </Link>
          <Link
            to={paths.account.wishlist}
            className={cx(styles.iconLink, styles.desktopOnly)}
            aria-label={withCount('المفضلة', counts.wishlist)}
          >
            <Icon name="heart" />
            <CountBadge count={counts.wishlist} />
          </Link>
          <Link
            to={paths.cart}
            className={styles.iconLink}
            aria-label={withCount('السلة', counts.cart)}
          >
            <Icon name="cart" />
            <CountBadge count={counts.cart} />
          </Link>
          <AccountPill />
        </div>
      </div>

      <MobileDrawer dialogRef={drawerRef} active={active} />
    </header>
  );
}
