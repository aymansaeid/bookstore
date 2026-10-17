import { NavLink, useNavigate } from 'react-router';

import { paths } from '@/app/paths';
import { useCustomerSummary, useUnreadNotificationsCount } from '@/features/account/queries';
import { logout } from '@/features/auth/session';
import type { Customer } from '@/features/auth/types';
import { tierLabel } from '@/shared/api/enums';
import { cx } from '@/shared/lib/cx';
import { formatBadgeCount, formatCount } from '@/shared/lib/format';
import { Icon } from '@/shared/ui/Icon/Icon';
import type { IconName } from '@/shared/ui/Icon/icons';

import styles from './AccountNav.module.css';

interface Item {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
  badge?: 'notifications';
}

/** Spec 5.9 sidebar, in the spec's order. */
const ITEMS: Item[] = [
  { to: paths.account.root, label: 'لوحتي', icon: 'home', end: true },
  { to: paths.account.library, label: 'مكتبتي', icon: 'book' },
  { to: paths.account.paths, label: 'مساراتي', icon: 'route' },
  { to: paths.account.orders, label: 'طلباتي', icon: 'box' },
  { to: paths.account.wishlist, label: 'المفضلة', icon: 'heart' },
  { to: paths.account.following, label: 'تنبيهات المحققين', icon: 'user' },
  { to: paths.account.notifications, label: 'الإشعارات', icon: 'bell', badge: 'notifications' },
  { to: paths.account.chats, label: 'محادثاتي مع أفندي', icon: 'send' },
  { to: paths.account.points, label: 'النقاط', icon: 'gift' },
  { to: paths.account.addresses, label: 'العناوين', icon: 'pin' },
  { to: paths.account.reviews, label: 'مراجعاتي', icon: 'check' },
  { to: paths.account.security, label: 'الحساب والأمان', icon: 'shield' },
];

/**
 * «حسابي» navigation: a sidebar card on desktop, a scrolling row of chips on
 * phones (the bottom nav already covers the main sections, spec §8.3).
 */
export function AccountNav({ customer }: { customer: Customer }) {
  const navigate = useNavigate();
  const summary = useCustomerSummary();
  const unread = useUnreadNotificationsCount();
  const initial = customer.firstName.trim().charAt(0) || customer.email.charAt(0);
  const unreadCount = unread.data ?? 0;

  return (
    <aside className={styles.sidebar} aria-label="حسابي">
      <div className={styles.profile}>
        <span className={styles.avatar} aria-hidden="true">
          {initial}
        </span>
        <div className={styles.who}>
          <p className={styles.name}>
            {customer.firstName} {customer.lastName}
          </p>
          {summary.data && (
            <p className={styles.tier}>
              ★ {tierLabel(summary.data.loyaltyTier)} · {formatCount(summary.data.loyaltyPoints)}{' '}
              نقطة
            </p>
          )}
        </div>
      </div>

      <nav aria-label="أقسام حسابي">
        <ul className={styles.list}>
          {ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) => cx(styles.link, isActive && styles.active)}
              >
                <Icon name={item.icon} size={18} />
                <span className={styles.label}>{item.label}</span>
                {item.badge === 'notifications' && unreadCount > 0 && (
                  <span
                    className={styles.count}
                    aria-label={`${formatCount(unreadCount)} غير مقروء`}
                  >
                    {formatBadgeCount(unreadCount)}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
          <li className={styles.logoutItem}>
            <button
              type="button"
              className={styles.link}
              onClick={() => {
                void navigate(paths.home);
                logout().catch(() => undefined);
              }}
            >
              <Icon name="lock" size={18} />
              <span className={styles.label}>تسجيل الخروج</span>
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
