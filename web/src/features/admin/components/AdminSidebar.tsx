import { NavLink } from 'react-router';

import { cx } from '@/shared/lib/cx';
import { formatBadgeCount } from '@/shared/lib/format';
import { Icon } from '@/shared/ui/Icon/Icon';
import { Logo } from '@/shared/ui/Logo/Logo';

import { ADMIN_NAV } from '../navigation';
import { useDashboard } from '../queries';

import styles from './AdminSidebar.module.css';

/** Spec 5.10: the dark sidebar. The orders badge counts paid orders awaiting shipment. */
export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const dashboard = useDashboard(30);
  const awaiting = dashboard.data?.ordersAwaitingShipment ?? 0;

  return (
    <nav className={styles.nav} aria-label="قائمة الإدارة">
      <div className={styles.logoWrap}>
        <Logo className={styles.logo} />
      </div>
      {ADMIN_NAV.map((group) => (
        <div key={group.title} className={styles.group}>
          <p className={styles.groupTitle}>{group.title}</p>
          <ul>
            {group.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end ?? false}
                  className={({ isActive }) =>
                    cx(styles.link, isActive && styles.active, item.soon && styles.soon)
                  }
                  onClick={onNavigate}
                >
                  <Icon name={item.icon} size={18} />
                  <span className={styles.label}>{item.label}</span>
                  {item.soon && <span className={styles.soonTag}>قريباً</span>}
                  {item.badge === 'awaitingShipment' && awaiting > 0 && (
                    <span className={styles.badge}>
                      {formatBadgeCount(awaiting)}
                      <span className="sr-only"> طلبات بانتظار الشحن</span>
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
