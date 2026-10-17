import { useRef, useState } from 'react';

import { returnsUrl } from '@/features/orders/links';
import type { OrderLookup, PublicOrder } from '@/features/orders/types';
import { orderStatusInfo } from '@/shared/api/enums';
import { formatDate } from '@/shared/lib/format';
import { Button, ButtonLink } from '@/shared/ui/Button/Button';
import { StatusBadge } from '@/shared/ui/StatusBadge/StatusBadge';
import { toast } from '@/shared/ui/toast/toastStore';

import { CancelOrderDialog } from './CancelOrderDialog';
import styles from './OrderDetails.module.css';
import { OrderDocumentsDialog } from './OrderDocumentsDialog';
import { OrderProgress } from './OrderProgress';
import { OrderSummary } from './OrderSummary';

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

interface OrderDetailsProps {
  order: PublicOrder;
  /** Number + email: what cancel, documents and returns are keyed by (API §6, §9). */
  lookup: OrderLookup;
  onCancelled: (order: PublicOrder) => void;
  onStale: () => void;
}

/**
 * One order in full: status, tracking bar, carrier, summary and the actions
 * the API allows. Used by /track and «طلباتي».
 */
export function OrderDetails({ order, lookup, onCancelled, onStale }: OrderDetailsProps) {
  const cancelRef = useRef<HTMLDialogElement>(null);
  const documentsRef = useRef<HTMLDialogElement>(null);
  const [documentsOpened, setDocumentsOpened] = useState(false);
  const status = orderStatusInfo(order.status);
  const note = statusNote(order);

  return (
    <div className={styles.details}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>
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
          onCancelled={onCancelled}
          onStale={onStale}
        />
      )}
      <OrderDocumentsDialog dialogRef={documentsRef} lookup={lookup} opened={documentsOpened} />
    </div>
  );
}
