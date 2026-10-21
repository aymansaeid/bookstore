import { useState } from 'react';

import styles from '@/features/admin/components/admin.module.css';
import { PICKUP_METHOD } from '@/features/checkout/shipping';
import { formatMoney } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { TextAreaField, TextField } from '@/shared/ui/form/Field';

import { type AdminOrder, adminOrdersApi } from '../api';
import { CARRIERS } from '../labels';
import { useOrderAction } from '../queries';

function TrackingForm({
  order,
  mode,
  onDone,
}: {
  order: AdminOrder;
  mode: 'ship' | 'correct';
  onDone?: () => void;
}) {
  const pickup = order.shippingMethodCode === PICKUP_METHOD;
  const [carrier, setCarrier] = useState(
    order.shippingCarrier ?? (pickup ? 'استلام من المكتبة' : ''),
  );
  const [tracking, setTracking] = useState(order.trackingNumber ?? '');
  const action = useOrderAction(
    order.id,
    ({ c, t }: { c: string; t: string }) =>
      mode === 'ship'
        ? adminOrdersApi.ship(order.id, c, t)
        : adminOrdersApi.correctTracking(order.id, c, t),
    mode === 'ship' ? 'شُحن الطلب، وأُرسل بريد إلى العميل.' : 'صُحّحت معلومات الشحن.',
  );
  const valid = carrier.trim() !== '' && tracking.trim() !== '';
  const listId = `carriers-${mode}`;

  return (
    <form
      className={styles.actionForm}
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid) return;
        action.mutate({ c: carrier.trim(), t: tracking.trim() }, { onSuccess: onDone });
      }}
    >
      <p className={styles.actionTitle}>
        {mode === 'ship' ? 'شحن الطلب' : 'تصحيح شركة الشحن أو رقم التتبع'}
      </p>
      <p className={styles.muted}>
        {mode === 'ship'
          ? 'يتحول الطلب إلى «مشحون» ويصل العميلَ بريد فيه رقم التتبع.'
          : 'لتصحيح خطأ في الكتابة فقط. لا يُرسل بريد جديد.'}
      </p>
      <TextField
        label="شركة الشحن"
        list={listId}
        maxLength={100}
        value={carrier}
        onChange={(event) => {
          setCarrier(event.target.value);
        }}
      />
      <datalist id={listId}>
        {CARRIERS.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <TextField
        label={pickup ? 'رقم الإيصال أو مرجع الاستلام' : 'رقم التتبع'}
        dir="ltr"
        maxLength={100}
        autoComplete="off"
        value={tracking}
        onChange={(event) => {
          setTracking(event.target.value);
        }}
      />
      <div className={styles.buttons}>
        <Button type="submit" variant="ink" size="sm" disabled={!valid || action.isPending}>
          {action.isPending ? 'جارٍ الحفظ…' : mode === 'ship' ? 'شحن وإبلاغ العميل' : 'حفظ التصحيح'}
        </Button>
        {onDone && (
          <Button variant="ghost" size="sm" onClick={onDone}>
            إلغاء
          </Button>
        )}
      </div>
    </form>
  );
}

function DeliverAction({ order }: { order: AdminOrder }) {
  const [confirming, setConfirming] = useState(false);
  const action = useOrderAction(order.id, () => adminOrdersApi.deliver(order.id), 'سُجّل التسليم.');
  return (
    <div className={styles.actionForm}>
      <p className={styles.actionTitle}>تأكيد التسليم</p>
      <p className={styles.muted}>عند وصول الطلب إلى العميل. تبدأ بعدها مهلة الإرجاع.</p>
      {confirming ? (
        <div className={styles.buttons}>
          <Button
            variant="ink"
            size="sm"
            disabled={action.isPending}
            onClick={() => {
              action.mutate(undefined);
            }}
          >
            {action.isPending ? 'جارٍ الحفظ…' : 'نعم، وصل الطلب'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setConfirming(false);
            }}
          >
            تراجع
          </Button>
        </div>
      ) : (
        <div className={styles.buttons}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setConfirming(true);
            }}
          >
            تمّ التسليم
          </Button>
        </div>
      )}
    </div>
  );
}

function CancelAction({ order }: { order: AdminOrder }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const action = useOrderAction(
    order.id,
    (text: string) => adminOrdersApi.cancel(order.id, text),
    'أُلغي الطلب وأُبلغ العميل.',
  );
  const paid = order.status === 'Paid';

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
          إلغاء الطلب
        </Button>
      </div>
    );
  }

  return (
    <form
      className={`${styles.actionForm} ${styles.danger}`}
      onSubmit={(event) => {
        event.preventDefault();
        if (reason.trim() !== '') action.mutate(reason.trim());
      }}
    >
      <p className={styles.actionTitle}>إلغاء الطلب نهائياً</p>
      <p className={styles.muted}>
        {paid
          ? `يُسترد ${formatMoney(order.total, order.currency)} تلقائياً إلى وسيلة الدفع، وتعود الكتب إلى المخزون، ويُستعاد استخدام الكوبون، ويصل العميلَ بريد. لا يمكن التراجع.`
          : 'تعود الكتب إلى المخزون ويصل العميلَ بريد. لا يمكن التراجع.'}
      </p>
      <TextAreaField
        label="سبب الإلغاء (يُحفظ في السجل)"
        rows={3}
        maxLength={500}
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
          {action.isPending ? 'جارٍ الإلغاء…' : paid ? 'إلغاء واسترداد المبلغ' : 'إلغاء الطلب'}
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

/** The action card, built from allowedActions only (API §10). */
export function OrderActions({ order }: { order: AdminOrder }) {
  const [correcting, setCorrecting] = useState(false);
  const can = (action: AdminOrder['allowedActions'][number]) =>
    order.allowedActions.includes(action);

  if (order.allowedActions.length === 0) {
    return <p className={styles.muted}>لا إجراءات متاحة لهذا الطلب في حالته الحالية.</p>;
  }

  return (
    <div className={styles.facts}>
      {can('Ship') && <TrackingForm order={order} mode="ship" />}
      {can('Deliver') && <DeliverAction order={order} />}
      {can('CorrectTracking') &&
        (correcting ? (
          <TrackingForm
            order={order}
            mode="correct"
            onDone={() => {
              setCorrecting(false);
            }}
          />
        ) : (
          <div className={styles.buttons}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCorrecting(true);
              }}
            >
              تصحيح رقم التتبع
            </Button>
          </div>
        ))}
      {can('Cancel') && <CancelAction order={order} />}
    </div>
  );
}
