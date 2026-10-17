import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { AccountHeader } from '@/features/account/components/AccountHeader';
import shared from '@/features/account/components/account.module.css';
import { OrderCard } from '@/features/account/components/OrderCard';
import { useCustomerSummary, useMyOrders } from '@/features/account/queries';
import { useSession } from '@/features/auth/session';
import { tierLabel } from '@/shared/api/enums';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { formatCount } from '@/shared/lib/format';
import { ButtonLink } from '@/shared/ui/Button/Button';
import { Icon } from '@/shared/ui/Icon/Icon';
import { Spark } from '@/shared/ui/Spark/Spark';

import styles from './AccountDashboardPage.module.css';

const RECENT = 3;

/** «لوحتي» (spec 5.9): greeting, four number cards, latest orders. */
export default function AccountDashboardPage() {
  const { customer } = useSession();
  const summary = useCustomerSummary();
  const orders = useMyOrders();
  const data = summary.data;

  const stats = [
    { label: 'طلباتي', value: data?.orderCount, to: paths.account.orders },
    { label: 'كتب في مكتبتي', value: data?.booksOwned, to: paths.account.library },
    { label: 'في المفضلة', value: data?.wishlistCount, to: paths.account.wishlist },
  ];

  return (
    <>
      <AccountHeader
        title={`أهلاً يا ${customer?.firstName ?? ''}`}
        description="هنا طلباتك ومكتبتك وكل ما يتذكّره أفندي عنك."
        action={
          <ButtonLink to={paths.askEfendi} variant="ink" size="sm">
            <Spark /> اسأل أفندي
          </ButtonLink>
        }
      />

      <ul className={styles.stats} aria-busy={summary.isPending}>
        {stats.map((stat) => (
          <li key={stat.label}>
            <Link to={stat.to} className={styles.stat}>
              <span className={styles.value}>
                {stat.value === undefined ? '—' : formatCount(stat.value)}
              </span>
              <span className={styles.statLabel}>{stat.label}</span>
            </Link>
          </li>
        ))}
        <li>
          <Link to={paths.account.points} className={cx(styles.stat, styles.dark)}>
            <span className={styles.value}>{data ? formatCount(data.loyaltyPoints) : '—'}</span>
            <span className={styles.statLabel}>
              نقطة ولاء{data ? ` · ${tierLabel(data.loyaltyTier)}` : ''}
            </span>
          </Link>
        </li>
      </ul>

      <section className={shared.card} aria-labelledby="recent-orders-title">
        <div className={shared.cardHead}>
          <h2 id="recent-orders-title" className={shared.cardTitle}>
            طلباتي الأخيرة
          </h2>
          {orders.data && orders.data.length > RECENT && (
            <Link to={paths.account.orders} className={shared.textLink}>
              كل الطلبات <Icon name="arrow" size={16} />
            </Link>
          )}
        </div>
        {orders.isPending ? (
          <div className={shared.skeleton} aria-busy="true" />
        ) : orders.isError ? (
          <p className={shared.muted} role="alert">
            {errorMessage(orders.error)}
          </p>
        ) : orders.data.length === 0 ? (
          <div className={shared.empty}>
            <p>لم تطلب شيئاً بعد.</p>
            <ButtonLink to={paths.search} variant="ink" size="sm">
              تصفّح المكتبة
            </ButtonLink>
          </div>
        ) : (
          <ul className={styles.orders}>
            {orders.data.slice(0, RECENT).map((order) => (
              <OrderCard key={order.orderNumber} order={order} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
