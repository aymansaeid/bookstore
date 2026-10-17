import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { useSession } from '@/features/auth/session';
import { ordersApi } from '@/features/orders/api';
import { CancelOrderDialog } from '@/features/orders/components/CancelOrderDialog';
import { OrderDocumentsDialog } from '@/features/orders/components/OrderDocumentsDialog';
import { OrderLookupForm } from '@/features/orders/components/OrderLookupForm';
import { OrderProgress } from '@/features/orders/components/OrderProgress';
import { OrderSummary } from '@/features/orders/components/OrderSummary';
import { returnsUrl } from '@/features/orders/links';
import type { OrderLookup, PublicOrder } from '@/features/orders/types';
import { useOrderLookup } from '@/features/orders/useOrderLookup';
import { orderStatusInfo } from '@/shared/api/enums';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { formatDate } from '@/shared/lib/format';
import { Button, ButtonLink } from '@/shared/ui/Button/Button';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';
import { Icon } from '@/shared/ui/Icon/Icon';
import { StatusBadge } from '@/shared/ui/StatusBadge/StatusBadge';
import { toast } from '@/shared/ui/toast/toastStore';

import styles from './OrderPages.module.css';

const trackKey = (lookup: OrderLookup) => ['order-track', lookup] as const;

/** What happened, in one sentence, for each status (API §6). */
function statusNote(order: PublicOrder): string | null {
  switch (order.status) {
    case 'PendingPayment':
      return 'لم يكتمل الدفع بعد. إن دفعت للتو فقد يستغرق التأكيد لحظات.';
    case 'Paid':
      return 'نجهّز طلبك الآن، وسنراسلك برقم التتبّع عند الشحن.';
    case 'Shipped':
      return order.shippingMethodCode === 'pickup'
        ? 'طلبك جاهز للاستلام من مكتبتنا.'
        : 'خرج طلبك مع شركة الشحن. قد يظهر رقم التتبّع على موقعها خلال ٢٤ ساعة.';
    case 'Delivered':
      return 'سُلّم طلبك. نتمنى لك قراءة نافعة.';
    case 'Cancelled':
      return 'أُلغي هذا الطلب. إن كان مدفوعاً فقد أُعيد المبلغ إلى بطاقتك.';
    case 'Expired':
      return 'انتهت مهلة الدفع قبل إتمامه، فأُلغي الطلب ولم يُخصم أي مبلغ.';
    case 'Refunded':
      return 'أُرجع الطلب وأُعيد المبلغ كاملاً.';
  }
}

function TrackingNumber({ carrier, number }: { carrier: string | null; number: string }) {
  return (
    <div className={styles.tracking}>
      <span className={styles.trackingLabel}>{carrier ?? 'رقم التتبّع'}</span>
      <code dir="ltr" className={styles.trackingNumber}>
        {number}
      </code>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          navigator.clipboard.writeText(number).then(
            () => {
              toast.success('نُسخ رقم التتبّع.');
            },
            () => {
              toast.error('تعذّر النسخ، انسخ الرقم يدوياً.');
            },
          );
        }}
      >
        نسخ
      </Button>
    </div>
  );
}

function OrderView({ lookup, order }: { lookup: OrderLookup; order: PublicOrder }) {
  const cancelRef = useRef<HTMLDialogElement>(null);
  const documentsRef = useRef<HTMLDialogElement>(null);
  const [documentsOpened, setDocumentsOpened] = useState(false);
  const status = orderStatusInfo(order.status);
  const note = statusNote(order);

  return (
    <div className={styles.result}>
      <div className={styles.orderHead}>
        <div>
          <h2 className={styles.orderTitle}>
            طلب رقم <span dir="ltr">{order.orderNumber}</span>
          </h2>
          <p className={styles.muted}>بتاريخ {formatDate(order.createdAtUtc)}</p>
        </div>
        <StatusBadge label={status.label} tone={status.tone} />
      </div>

      <OrderProgress order={order} />
      {note && <p className={styles.note}>{note}</p>}

      {order.trackingNumber && (
        <TrackingNumber carrier={order.shippingCarrier} number={order.trackingNumber} />
      )}

      <OrderSummary order={order} />

      <div className={styles.actions}>
        {order.status === 'Delivered' && (
          <ButtonLink
            to={returnsUrl(order.orderNumber)}
            state={{ email: lookup.email }}
            variant="ink"
          >
            طلب إرجاع
          </ButtonLink>
        )}
        {order.canBeCancelled && (
          <Button
            variant="ghost"
            onClick={() => {
              cancelRef.current?.showModal();
            }}
          >
            إلغاء الطلب
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => {
            setDocumentsOpened(true);
            documentsRef.current?.showModal();
          }}
        >
          مستندات الطلب
        </Button>
      </div>
      {order.status === 'Shipped' && order.shippingMethodCode !== 'pickup' && (
        <p className={styles.muted}>يمكنك طلب الإرجاع خلال ١٤ يوماً من استلام الطلب.</p>
      )}

      {order.canBeCancelled && (
        <CancelOrderDialog
          dialogRef={cancelRef}
          lookup={lookup}
          order={order}
          queryKey={trackKey(lookup)}
        />
      )}
      <OrderDocumentsDialog dialogRef={documentsRef} lookup={lookup} opened={documentsOpened} />
    </div>
  );
}

/** /track?order=… (linked from every order email, API §11). */
export default function TrackOrderPage() {
  const { customer } = useSession();
  const { lookup, orderNumber, email, setLookup, clear } = useOrderLookup();

  const order = useQuery({
    queryKey: trackKey(lookup ?? { orderNumber: '', email: '' }),
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
        <>
          <OrderView lookup={lookup} order={order.data} />
          <button type="button" className={styles.another} onClick={clear}>
            <Icon name="search" size={16} /> تتبّع طلباً آخر
          </button>
        </>
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
