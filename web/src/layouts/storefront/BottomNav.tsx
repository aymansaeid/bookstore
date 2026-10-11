import { Link, useLocation } from 'react-router';

import { activeBottomNavId, type BottomNavId } from '@/app/navigation';
import { paths } from '@/app/paths';
import { cx } from '@/shared/lib/cx';
import { formatCount } from '@/shared/lib/format';
import { CountBadge } from '@/shared/ui/CountBadge/CountBadge';
import { EffendiAvatar } from '@/shared/ui/EffendiAvatar/EffendiAvatar';
import { Icon } from '@/shared/ui/Icon/Icon';
import type { IconName } from '@/shared/ui/Icon/icons';

import styles from './BottomNav.module.css';
import { useHeaderCounts } from './useHeaderCounts';

interface Tab {
  id: Exclude<BottomNavId, 'ask'>;
  label: string;
  to: string;
  icon: IconName;
}

const start: Tab[] = [
  { id: 'home', label: 'الرئيسية', to: paths.home, icon: 'home' },
  { id: 'library', label: 'المكتبة', to: paths.search, icon: 'book' },
];
const end: Tab[] = [
  { id: 'cart', label: 'السلة', to: paths.cart, icon: 'cart' },
  { id: 'account', label: 'حسابي', to: paths.account.root, icon: 'user' },
];

/** Mobile bottom navigation (spec §5.11, §8.3). Hidden from 768px. */
export function BottomNav() {
  const { pathname } = useLocation();
  const active = activeBottomNavId(pathname);
  const { cart } = useHeaderCounts();

  const renderTab = (tab: Tab) => {
    const isActive = tab.id === active;
    const count = tab.id === 'cart' ? cart : 0;
    return (
      <li key={tab.id}>
        <Link
          to={tab.to}
          className={cx(styles.link, isActive && styles.active)}
          aria-current={isActive ? 'page' : undefined}
        >
          <span className={styles.iconWrap}>
            <Icon name={tab.icon} size={22} />
            <CountBadge count={count} className={styles.badge} />
          </span>
          {tab.label}
          {count > 0 && <span className="sr-only">({formatCount(count)})</span>}
        </Link>
      </li>
    );
  };

  return (
    <nav className={styles.root} aria-label="التنقّل السفلي">
      <ul className={styles.list}>
        {start.map(renderTab)}
        <li>
          <Link
            to={paths.askEfendi}
            className={cx(styles.link, styles.efendi, active === 'ask' && styles.active)}
            aria-current={active === 'ask' ? 'page' : undefined}
          >
            <span className={styles.bubble}>
              <EffendiAvatar size={44} />
            </span>
            أفندي
          </Link>
        </li>
        {end.map(renderTab)}
      </ul>
    </nav>
  );
}
