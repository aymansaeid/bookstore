import type { TFunction } from 'i18next';
import { useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

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
function statusNote(t: TFunction<'orders'>, order: PublicOrder): string | null {
  if (order.status === 'Shipped' && order.shippingMethodCode === 'pickup') {
    return t('status.ShippedPickup');
  }
  switch (order.status) {
    case 'PendingPayment':
    case 'Paid':
    case 'Shipped':
    case 'Delivered':
    case 'Cancelled':
    case 'Expired':
    case 'Refunded':
      return t(`status.${order.status}`);
  }
}

function TrackingNumber({ carrier, number }: { carrier: string | null; number: string }) {
  const { t } = useTranslation('orders', { keyPrefix: 'details' });
  return (
    <div className={styles.tracking}>
      <span className={styles.trackingLabel}>{carrier ?? t('trackingNumber')}</span>
      <code dir="ltr" className={styles.trackingNumber}>
        {number}
      </code>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          navigator.clipboard.writeText(number).then(
            () => {
              toast.success(t('copied'));
            },
            () => {
              toast.error(t('copyFailed'));
            },
          );
        }}
      >
        {t('copy')}
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
  const { t } = useTranslation('orders');
  const cancelRef = useRef<HTMLDialogElement>(null);
  const documentsRef = useRef<HTMLDialogElement>(null);
  const [documentsOpened, setDocumentsOpened] = useState(false);
  const status = orderStatusInfo(order.status);
  const note = statusNote(t, order);

  return (
    <div className={styles.details}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>
            <Trans
              t={t}
              i18nKey="details.title"
              values={{ number: order.orderNumber }}
              components={{ n: <span dir="ltr" /> }}
            />
          </h2>
          <p className={styles.muted}>
            {t('details.placed', { date: formatDate(order.createdAtUtc) })}
          </p>
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
            {t('details.return')}
          </ButtonLink>
        )}
        {order.canBeCancelled && (
          <Button
            variant="ghost"
            onClick={() => {
              cancelRef.current?.showModal();
            }}
          >
            {t('details.cancel')}
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => {
            setDocumentsOpened(true);
            documentsRef.current?.showModal();
          }}
        >
          {t('details.documents')}
        </Button>
      </div>
      {order.status === 'Shipped' && order.shippingMethodCode !== 'pickup' && (
        <p className={styles.muted}>{t('details.returnWindow')}</p>
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