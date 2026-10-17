import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { OrderLookup } from '@/features/orders/types';
import { returnKeys, returnsApi } from '@/features/returns/api';
import type { ReturnEligibility } from '@/features/returns/types';
import { RETURN_REASONS, type ReturnReason, returnReasonLabel } from '@/shared/api/enums';
import { errorMessage } from '@/shared/api/errorMessages';
import { formatCount, formatDate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { FormAlert, TextAreaField } from '@/shared/ui/form/Field';
import { QuantityStepper } from '@/shared/ui/QuantityStepper/QuantityStepper';
import { toast } from '@/shared/ui/toast/toastStore';

import styles from './Returns.module.css';

const COMMENT_MAX = 1000;

/** API §9 request form: one row per book, 0 to purchasedQuantity each. */
export function ReturnForm({
  lookup,
  eligibility,
}: {
  lookup: OrderLookup;
  eligibility: ReturnEligibility;
}) {
  const queryClient = useQueryClient();
  const single = eligibility.lines.length === 1 ? eligibility.lines[0] : undefined;
  // One book bought once: preselect it, there is nothing else to choose.
  const [quantities, setQuantities] = useState<Record<number, number>>(() =>
    single?.purchasedQuantity === 1 ? { [single.bookId]: 1 } : {},
  );
  const [reason, setReason] = useState<ReturnReason | null>(null);
  const [comment, setComment] = useState('');

  const items = eligibility.lines
    .map((line) => ({ bookId: line.bookId, quantity: quantities[line.bookId] ?? 0 }))
    .filter((item) => item.quantity > 0);

  const submit = useMutation({
    mutationFn: () => {
      if (!reason) throw new Error('No reason');
      const text = comment.trim();
      return returnsApi.request(lookup, { items, reason, comment: text === '' ? null : text });
    },
    onSuccess: (created) => {
      queryClient.setQueryData(returnKeys.status(lookup), created);
      void queryClient.invalidateQueries({ queryKey: returnKeys.eligibility(lookup) });
      toast.success('أرسلنا طلب الإرجاع، وستصلك رسالة بالتفاصيل.');
    },
  });

  return (
    <form
      className={styles.card}
      aria-labelledby="return-form-title"
      onSubmit={(event) => {
        event.preventDefault();
        submit.mutate();
      }}
    >
      <h2 id="return-form-title" className={styles.cardTitle}>
        طلب إرجاع
      </h2>
      {eligibility.deadline && (
        <p className={styles.muted}>
          يمكنك طلب الإرجاع حتى {formatDate(eligibility.deadline)} (١٤ يوماً من الاستلام).
        </p>
      )}

      <fieldset className={styles.group}>
        <legend className={styles.legend}>الكتب التي تريد إرجاعها</legend>
        <ul className={styles.pickLines}>
          {eligibility.lines.map((line) => (
            <li key={line.bookId} className={styles.pickLine}>
              <span className={styles.lineTitle}>
                {line.title}
                <span className={styles.muted}>
                  {' '}
                  (اشتريت {formatCount(line.purchasedQuantity)})
                </span>
              </span>
              <QuantityStepper
                value={quantities[line.bookId] ?? 0}
                min={0}
                max={line.purchasedQuantity}
                label={`عدد نسخ «${line.title}» المرتجعة`}
                onChange={(value) => {
                  setQuantities((current) => ({ ...current, [line.bookId]: value }));
                }}
              />
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>سبب الإرجاع</legend>
        <div className={styles.reasons}>
          {RETURN_REASONS.map((value) => (
            <label key={value} className={styles.reason}>
              <input
                type="radio"
                name="return-reason"
                checked={reason === value}
                onChange={() => {
                  setReason(value);
                }}
              />
              {returnReasonLabel(value)}
            </label>
          ))}
        </div>
      </fieldset>

      <TextAreaField
        label="تفاصيل إضافية (اختياري)"
        hint={`مثلاً: وصف التلف. حتى ${formatCount(COMMENT_MAX)} حرف.`}
        maxLength={COMMENT_MAX}
        rows={4}
        value={comment}
        onChange={(event) => {
          setComment(event.target.value);
        }}
      />

      {submit.isError && <FormAlert>{errorMessage(submit.error)}</FormAlert>}

      <Button
        type="submit"
        variant="red"
        className={styles.submit}
        disabled={items.length === 0 || !reason || submit.isPending}
      >
        {submit.isPending ? 'جارٍ الإرسال…' : 'إرسال طلب الإرجاع'}
      </Button>
      <p className={styles.muted}>
        بعد موافقتنا نرسل إليك تعليمات الإرسال، ونعيد المبلغ فور وصول الكتب.
      </p>
    </form>
  );
}
