import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { OrderLookup } from '@/features/orders/types';
import { returnKeys, returnsApi } from '@/features/returns/api';
import type { PublicReturn } from '@/features/returns/types';
import { returnReasonLabel, returnStatusInfo } from '@/shared/api/enums';
import { errorMessage } from '@/shared/api/errorMessages';
import { formatCount, formatDate, formatMoney } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { FormAlert } from '@/shared/ui/form/Field';
import { StatusBadge } from '@/shared/ui/StatusBadge/StatusBadge';
import { toast } from '@/shared/ui/toast/toastStore';

import styles from './Returns.module.css';

/** What happens next, per status (orders.json → returns.next…). */
const NEXT_STEP = {
  Requested: 'nextRequested',
  Approved: 'nextApproved',
  Completed: 'nextCompleted',
  Rejected: 'nextRejected',
  CancelledByCustomer: 'nextCancelledByCustomer',
} as const;

const nextStepKey = (status: string) =>
  (NEXT_STEP as Readonly<Record<string, (typeof NEXT_STEP)[keyof typeof NEXT_STEP] | undefined>>)[
    status
  ];

/** The latest return for an order (API §9), with «سحب الطلب» while it can still be withdrawn. */
export function ReturnStatusCard({ lookup, value }: { lookup: OrderLookup; value: PublicReturn }) {
  const { t } = useTranslation('orders', { keyPrefix: 'returns' });
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const status = returnStatusInfo(value.status);
  const next = nextStepKey(value.status);
  const canWithdraw = value.status === 'Requested' || value.status === 'Approved';

  const withdraw = useMutation({
    mutationFn: () => returnsApi.cancel(lookup),
    onSuccess: (updated) => {
      queryClient.setQueryData(returnKeys.status(lookup), updated);
      void queryClient.invalidateQueries({ queryKey: returnKeys.eligibility(lookup) });
      setConfirming(false);
      toast.success(t('withdrawn'));
    },
  });

  return (
    <section className={styles.card} aria-labelledby="return-status-title">
      <div className={styles.cardHead}>
        <h2 id="return-status-title" className={styles.cardTitle}>
          {t('statusTitle')}
        </h2>
        <StatusBadge label={status.label} tone={status.tone} />
      </div>
      <p className={styles.muted}>
        {t('requested', {
          date: formatDate(value.requestedAtUtc),
          reason: returnReasonLabel(value.reason),
        })}
      </p>
      {next && <p className={styles.next}>{t(next)}</p>}

      <ul className={styles.returnLines}>
        {value.lines.map((line) => (
          <li key={line.bookId}>
            <span className={styles.lineTitle}>{line.title}</span>
            <span className={styles.muted}>× {formatCount(line.quantity)}</span>
          </li>
        ))}
      </ul>

      <p className={styles.refund}>
        {value.status === 'Completed' ? t('refunded') : t('toRefund')}
        <b>{formatMoney(value.refundAmount, value.currency)}</b>
      </p>
      <p className={styles.muted}>{value.isFullReturn ? t('full') : t('partial')}</p>

      {value.returnInstructions && (
        <div className={styles.instructions}>
          <h3 className={styles.subTitle}>{t('instructions')}</h3>
          <p>{value.returnInstructions}</p>
        </div>
      )}
      {value.rejectionReason && (
        <div className={styles.rejection}>
          <h3 className={styles.subTitle}>{t('rejection')}</h3>
          <p>{value.rejectionReason}</p>
        </div>
      )}

      {withdraw.isError && <FormAlert>{errorMessage(withdraw.error)}</FormAlert>}
      {canWithdraw &&
        (confirming ? (
          <div className={styles.confirm}>
            <p>{t('withdrawQuestion')}</p>
            <div className={styles.actions}>
              <Button
                variant="red"
                size="sm"
                disabled={withdraw.isPending}
                onClick={() => {
                  withdraw.mutate();
                }}
              >
                {withdraw.isPending ? t('withdrawing') : t('withdrawYes')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setConfirming(false);
                }}
              >
                {t('no')}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className={styles.withdraw}
            onClick={() => {
              setConfirming(true);
            }}
          >
            {t('withdraw')}
          </Button>
        ))}
    </section>
  );
}