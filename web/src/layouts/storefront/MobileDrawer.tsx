import { type RefObject, useEffect } from 'react';
import { Link, useLocation } from 'react-router';

import type { NavId } from '@/app/navigation';
import { paths } from '@/app/paths';
import { Icon } from '@/shared/ui/Icon/Icon';
import { Logo } from '@/shared/ui/Logo/Logo';

import { PrimaryNav } from './PrimaryNav';
import styles from './MobileDrawer.module.css';

interface MobileDrawerProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  active: NavId | null;
}

/**
 * ☰ side menu (spec §8.3). A native modal <dialog>: focus trap, Esc to close
 * and an inert page behind it, with no extra libraries.
 */
export function MobileDrawer({ dialogRef, active }: MobileDrawerProps) {
  const location = useLocation();

  // Any navigation (a link inside, or back/forward) closes the menu.
  useEffect(() => {
    dialogRef.current?.close();
  }, [location.key, dialogRef]);

  const close = () => {
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className={styles.drawer} aria-labelledby="drawer-title">
      <div className={styles.head}>
        <h2 id="drawer-title" className="sr-only">
          قائمة الموقع
        </h2>
        <Logo className={styles.logo} alt="" />
        <button type="button" className={styles.close} aria-label="إغلاق القائمة" onClick={close}>
          <Icon name="x" size={22} />
        </button>
      </div>

      <PrimaryNav active={active} label="روابط الموقع" variant="drawer" />

      <ul className={styles.secondary}>
        <li>
          <Link to={paths.account.root} className={styles.link}>
            <Icon name="user" />
            حسابي
          </Link>
        </li>
        <li>
          <Link to={paths.account.wishlist} className={styles.link}>
            <Icon name="heart" />
            المفضلة
          </Link>
        </li>
        <li>
          <Link to={paths.trackOrder} className={styles.link}>
            <Icon name="truck" />
            تتبّع الطلب
          </Link>
        </li>
      </ul>

      <p className={styles.meta}>
        العربية ·{' '}
        <span lang="en" dir="ltr">
          TRY ₺
        </span>
      </p>
    </dialog>
  );
}
