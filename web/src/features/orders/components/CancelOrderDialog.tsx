import { useMutation } from '@tanstack/react-query';
import { type RefObject, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ordersApi } from '@/features/orders/api';
import type { OrderLookup, PublicOrder } from '@/features/orders/types';
import { ApiError } from '@/shared/api/ApiError';
import { CANCEL_REASONS, type CancelReason, cancelReasonLabel } from '@/shared/api/enums';
import { errorMessage } from '@/shared/api/errorMessages';
import { formatCount } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { FormAlert, TextAreaField } from '@/shared/ui/form/Field';
import { Icon } from '@/shared/ui/Icon/Icon';
import { toast } from '@/shared/ui/toast/toastStore';

import styles from './OrderDialogs.module.css';

const COMMENT_MAX = 400;

interface CancelOrderDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  lookup: OrderLookup;
  order: PublicOrder;
  /** Receives the cancelled order, so the page can show it. */
  onCancelled: (order: PublicOrder) => void;
  /** Shipped or paid a moment ago: the page should reload the order. */
  onStale: () => void;
}

/** API §6: guests and customers cancel until shipping; paid orders are refunded. */
export function CancelOrderDialog({
  dialogRef,
  lookup,
  order,
  onCancelled,
  onStale,
}: CancelOrderDialogProps) {
  const { t } = useTranslation('orders', { keyPrefix: 'cancel' });
  const [reason, setReason] = useState<CancelReason | null>(null);
  const [comment, setComment] = useState('');

  const cancel = useMutation({
    mutationFn: () => {
      if (!reason) throw new Error('No reason');
      const text = comment.trim();
      return ordersApi.cancel(lookup, reason, text === '' ? null : text);
    },
    onSuccess: (updated) => {
      onCancelled(updated);
      dialogRef.current?.close();
      toast.success(order.status === 'Paid' ? t('doneRefund') : t('done'));
    },
    onError: (error) => {
      // Shipped or paid a moment ago: show the order as it is now.
      if (
        error instanceof ApiError &&
        (error.code === 'Order.AlreadyShipped' || error.code === 'Order.PaymentJustCompleted')
      ) {
        onStale();
      }
    },
  });

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="cancel-order-title">
      <form
        className={styles.body}
        onSubmit={(event) => {
          event.preventDefault();
          cancel.mutate();
        }}
      >
        <div className={styles.head}>
          <h2 id="cancel-order-title" className={styles.title}>
            <Trans
              t={t}
              i18nKey="title"
              values={{ number: order.orderNumber }}
              components={{ n: <span dir="ltr" /> }}
            />
          </h2>
          <button
            type="button"
            className={styles.close}
            aria-label={t('close')}
            onClick={() => {
              dialogRef.current?.close();
            }}
          >
            <Icon name="x" size={22} />
          </button>
        </div>

        <p className={styles.warning}>
          {t('warning')}
          {order.status === 'Paid' && t('refund')}
        </p>

        <fieldset className={styles.reasons}>
          <legend className={styles.legend}>{t('reason')}</legend>
          {CANCEL_REASONS.map((value) => (
            <label key={value} className={styles.reason}>
              <input
                type="radio"
                name="cancel-reason"
                checked={reason === value}
                onChange={() => {
                  setReason(value);
                }}
              />
              {cancelReasonLabel(value)}
            </label>
          ))}
        </fieldset>

        <TextAreaField
          label={t('note')}
          hint={t('noteHint', { n: formatCount(COMMENT_MAX) })}
          maxLength={COMMENT_MAX}
          rows={3}
          value={comment}
          onChange={(event) => {
            setComment(event.target.value);
          }}
        />

        {cancel.isError && <FormAlert>{errorMessage(cancel.error)}</FormAlert>}

        <div className={styles.actions}>
          <Button type="submit" variant="red" disabled={!reason || cancel.isPending}>
            {cancel.isPending ? t('cancelling') : t('confirm')}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              dialogRef.current?.close();
            }}
          >
            {t('back')}
          </Button>
        </div>
      </form>
    </dialog>
  );
}