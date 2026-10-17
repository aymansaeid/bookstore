import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { useSession } from '@/features/auth/session';
import { ordersApi } from '@/features/orders/api';
import { OrderDetails } from '@/features/orders/components/OrderDetails';
import { OrderLookupForm } from '@/features/orders/components/OrderLookupForm';
import type { OrderLookup } from '@/features/orders/types';
import { useOrderLookup } from '@/features/orders/useOrderLookup';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';
import { Icon } from '@/shared/ui/Icon/Icon';

import styles from './OrderPages.module.css';

const trackKey = (lookup: OrderLookup) => ['order-track', lookup] as const;

/** /track?order=… (linked from every order email, API §11). */
export default function TrackOrderPage() {
  const queryClient = useQueryClient();
  const { customer } = useSession();
  const { lookup, orderNumber, email, setLookup, clear } = useOrderLookup();
  const key = trackKey(lookup ?? { orderNumber: '', email: '' });

  const order = useQuery({
    queryKey: key,
    queryFn: () => (lookup ? ordersApi.track(lookup.orderNumber, lookup.email) : null),
    enabled: lookup !== null,
    staleTime: 30_000,
  });

  const showForm = !lookup || order.isError;

  return (
    <div className={cx('wrap', styles.page)}>
      <DocumentTitle title="تتبّع الطلب" />
      <header className={styles.header}>
        <h1 className={styles.title}>تتبّع الطلب</h1>
        <p className={styles.lead}>أدخل رقم الطلب والبريد الإلكتروني لمعرفة حالته ورقم الشحنة.</p>
      </header>

      {showForm ? (
        <OrderLookupForm
          key={`${orderNumber}|${email}`}
          defaults={{ orderNumber, email: email || (customer?.email ?? '') }}
          submitLabel="تتبّع الطلب"
          busy={order.isFetching}
          error={order.isError ? errorMessage(order.error) : null}
          onLookup={(next) => {
            // Same details again after an error: ask the server again.
            if (lookup?.orderNumber === next.orderNumber && lookup.email === next.email) {
              void order.refetch();
            } else {
              setLookup(next);
            }
          }}
        />
      ) : order.isPending ? (
        <div className={styles.skeleton} aria-busy="true" aria-label="جارٍ البحث عن الطلب" />
      ) : order.data ? (
        <div className={styles.result}>
          <OrderDetails
            order={order.data}
            lookup={lookup}
            onCancelled={(updated) => {
              queryClient.setQueryData(key, updated);
            }}
            onStale={() => {
              void order.refetch();
            }}
          />
          <button type="button" className={styles.another} onClick={clear}>
            <Icon name="search" size={16} /> تتبّع طلباً آخر
          </button>
        </div>
      ) : null}

      {customer && (
        <p className={styles.muted}>
          كل طلباتك في صفحة{' '}
          <Link to={paths.account.orders} className={styles.inlineLink}>
            طلباتي
          </Link>
          .
        </p>
      )}
    </div>
  );
}
