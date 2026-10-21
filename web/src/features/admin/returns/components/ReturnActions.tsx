import { useState } from 'react';

import styles from '@/features/admin/components/admin.module.css';
import { cx } from '@/shared/lib/cx';
import { formatCount, formatMoney } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { TextAreaField } from '@/shared/ui/form/Field';

import { type AdminReturn, adminReturnsApi, type ItemCondition } from '../api';
import { CONDITION_LABELS } from '../labels';
import { useReturnAction } from '../queries';

import local from './ReturnActions.module.css';

function ApproveForm({ item }: { item: AdminReturn }) {
  const [instructions, setInstructions] = useState('');
  const action = useReturnAction(
    item.id,
    (text: string | null) => adminReturnsApi.approve(item.id, text),
    'تمت الموافقة، ووصلت التعليمات إلى العميل.',
  );
  return (
    <form
      className={styles.actionForm}
      onSubmit={(event) => {
        event.preventDefault();
        action.mutate(instructions.trim() === '' ? null : instructions.trim());
      }}
    >
      <p className={styles.actionTitle}>الموافقة على الإرجاع</p>
      <TextAreaField
        label="تعليمات الإرسال للعميل (اختياري)"
        hint="اتركها فارغة لاستخدام عنوان الإرجاع الافتراضي من الإعدادات."
        rows={3}
        maxLength={2000}
        value={instructions}
        onChange={(event) => {
          setInstructions(event.target.value);
        }}
      />
      <div className={styles.buttons}>
        <Button type="submit" variant="ink" size="sm" disabled={action.isPending}>
          {action.isPending ? 'جارٍ الحفظ…' : 'موافقة وإرسال التعليمات'}
        </Button>
      </div>
    </form>
  );
}

function RejectForm({ item }: { item: AdminReturn }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const action = useReturnAction(
    item.id,
    (text: string) => adminReturnsApi.reject(item.id, text),
    'رُفض الإرجاع وأُبلغ العميل بالسبب.',
  );

  if (!open) {
    return (
      <div className={styles.buttons}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(true);
          }}
        >
          رفض الإرجاع
        </Button>
      </div>
    );
  }
  return (
    <form
      className={cx(styles.actionForm, styles.danger)}
      onSubmit={(event) => {
        event.preventDefault();
        if (reason.trim() !== '') action.mutate(reason.trim());
      }}
    >
      <p className={styles.actionTitle}>رفض الإرجاع</p>
      <TextAreaField
        label="السبب (يظهر للعميل)"
        hint="الرفض يمسّ حقاً قانونياً للعميل، فاكتب سبباً واضحاً ولطيفاً."
        rows={3}
        maxLength={1000}
        value={reason}
        onChange={(event) => {
          setReason(event.target.value);
        }}
      />
      <div className={styles.buttons}>
        <Button
          type="submit"
          variant="red"
          size="sm"
          disabled={reason.trim() === '' || action.isPending}
        >
          {action.isPending ? 'جارٍ الحفظ…' : 'رفض وإبلاغ العميل'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false);
          }}
        >
          تراجع
        </Button>
      </div>
    </form>
  );
}

function CompleteForm({ item }: { item: AdminReturn }) {
  const [conditions, setConditions] = useState<Partial<Record<number, ItemCondition>>>({});
  const [confirming, setConfirming] = useState(false);
  const action = useReturnAction(
    item.id,
    () =>
      adminReturnsApi.complete(
        item.id,
        item.lines.map((line) => ({
          bookId: line.bookId,
          condition: conditions[line.bookId] ?? 'Resellable',
        })),
      ),
    'اكتمل الإرجاع واستُرد المبلغ.',
  );
  const allSet = item.lines.every((line) => conditions[line.bookId] !== undefined);

  return (
    <form
      className={styles.actionForm}
      onSubmit={(event) => {
        event.preventDefault();
        if (!allSet) return;
        if (!confirming) {
          setConfirming(true);
          return;
        }
        action.mutate(undefined);
      }}
    >
      <p className={styles.actionTitle}>وصل الطرد: فحص الكتب واسترداد المبلغ</p>
      <p className={styles.muted}>حدّد حالة كل كتاب. السليم يعود إلى المخزون، والتالف لا يعود.</p>
      {item.lines.map((line) => (
        <fieldset key={line.bookId} className={local.line}>
          <legend className={local.lineTitle}>
            {line.title} <span className={styles.muted}>× {formatCount(line.quantity)}</span>
          </legend>
          <div className={local.choices}>
            {(['Resellable', 'Damaged'] as const).map((condition) => (
              <label
                key={condition}
                className={cx(local.choice, conditions[line.bookId] === condition && local.on)}
              >
                <input
                  type="radio"
                  name={`condition-${String(line.bookId)}`}
                  checked={conditions[line.bookId] === condition}
                  onChange={() => {
                    setConfirming(false);
                    setConditions((current) => ({ ...current, [line.bookId]: condition }));
                  }}
                />
                {CONDITION_LABELS[condition]}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      {confirming && (
        <p className={local.confirm} role="alert">
          سيُسترد {formatMoney(item.refundAmount, item.currency)} الآن إلى وسيلة الدفع الأصلية. لا
          يمكن التراجع.
        </p>
      )}
      <div className={styles.buttons}>
        <Button
          type="submit"
          variant={confirming ? 'red' : 'ink'}
          size="sm"
          disabled={!allSet || action.isPending}
        >
          {action.isPending
            ? 'جارٍ الاسترداد…'
            : confirming
              ? `نعم، استرد ${formatMoney(item.refundAmount, item.currency)}`
              : 'إكمال الإرجاع'}
        </Button>
        {confirming && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setConfirming(false);
            }}
          >
            تراجع
          </Button>
        )}
      </div>
    </form>
  );
}

/** Built from allowedActions only (API §10). */
export function ReturnActions({ item }: { item: AdminReturn }) {
  if (item.allowedActions.length === 0) {
    return <p className={styles.muted}>لا إجراءات متاحة لهذا الإرجاع في حالته الحالية.</p>;
  }
  return (
    <div className={styles.facts}>
      {item.allowedActions.includes('Approve') && <ApproveForm item={item} />}
      {item.allowedActions.includes('Complete') && <CompleteForm item={item} />}
      {item.allowedActions.includes('Reject') && <RejectForm item={item} />}
    </div>
  );
}
