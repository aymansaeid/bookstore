import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

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

const NEXT_STEP: Readonly<Record<string, string>> = {
  Requested: 'وصلنا طلبك، وسنراجعه ونراسلك قريباً بتعليمات الإرسال.',
  Approved: 'وافقنا على طلبك. أرسل الكتب باتباع التعليمات أدناه، ونردّ المبلغ فور وصولها.',
  Completed: 'وصلتنا الكتب وأُعيد المبلغ إلى وسيلة الدفع الأصلية.',
  Rejected: 'لم نتمكن من قبول طلب الإرجاع للسبب المذكور أدناه.',
  CancelledByCustomer: 'سحبت طلب الإرجاع.',
};

/** The latest return for an order (API §9), with «سحب الطلب» while it can still be withdrawn. */
export function ReturnStatusCard({ lookup, value }: { lookup: OrderLookup; value: PublicReturn }) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const status = returnStatusInfo(value.status);
  const canWithdraw = value.status === 'Requested' || value.status === 'Approved';

  const withdraw = useMutation({
    mutationFn: () => returnsApi.cancel(lookup),
    onSuccess: (updated) => {
      queryClient.setQueryData(returnKeys.status(lookup), updated);
      void queryClient.invalidateQueries({ queryKey: returnKeys.eligibility(lookup) });
      setConfirming(false);
      toast.success('سُحب طلب الإرجاع.');
    },
  });

  return (
    <section className={styles.card} aria-labelledby="return-status-title">
      <div className={styles.cardHead}>
        <h2 id="return-status-title" className={styles.cardTitle}>
          طلب الإرجاع
        </h2>
        <StatusBadge label={status.label} tone={status.tone} />
      </div>
      <p className={styles.muted}>
        قُدّم في {formatDate(value.requestedAtUtc)} · السبب: {returnReasonLabel(value.reason)}
      </p>
      {NEXT_STEP[value.status] && <p className={styles.next}>{NEXT_STEP[value.status]}</p>}

      <ul className={styles.returnLines}>
        {value.lines.map((line) => (
          <li key={line.bookId}>
            <span className={styles.lineTitle}>{line.title}</span>
            <span className={styles.muted}>× {formatCount(line.quantity)}</span>
          </li>
        ))}
      </ul>

      <p className={styles.refund}>
        {value.status === 'Completed' ? 'المبلغ المُعاد' : 'المبلغ الذي سيُعاد'}
        <b>{formatMoney(value.refundAmount, value.currency)}</b>
      </p>
      <p className={styles.muted}>
        {value.isFullReturn
          ? 'إرجاع كامل: يُعاد إجمالي الطلب بما فيه الشحن.'
          : 'إرجاع جزئي: تُعاد حصة الكتب المرتجعة بعد الخصم، دون الشحن.'}
      </p>

      {value.returnInstructions && (
        <div className={styles.instructions}>
          <h3 className={styles.subTitle}>تعليمات الإرسال</h3>
          <p>{value.returnInstructions}</p>
        </div>
      )}
      {value.rejectionReason && (
        <div className={styles.rejection}>
          <h3 className={styles.subTitle}>سبب الرفض</h3>
          <p>{value.rejectionReason}</p>
        </div>
      )}

      {withdraw.isError && <FormAlert>{errorMessage(withdraw.error)}</FormAlert>}
      {canWithdraw &&
        (confirming ? (
          <div className={styles.confirm}>
            <p>هل تريد سحب طلب الإرجاع؟</p>
            <div className={styles.actions}>
              <Button
                variant="red"
                size="sm"
                disabled={withdraw.isPending}
                onClick={() => {
                  withdraw.mutate();
                }}
              >
                {withdraw.isPending ? 'جارٍ السحب…' : 'نعم، اسحب الطلب'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setConfirming(false);
                }}
              >
                لا
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
            سحب طلب الإرجاع
          </Button>
        ))}
    </section>
  );
}
