import { useEffect, useState } from 'react';

import styles from '@/features/admin/components/admin.module.css';
import { cx } from '@/shared/lib/cx';
import { formatCount } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { TextAreaField, TextField } from '@/shared/ui/form/Field';
import { toast } from '@/shared/ui/toast/toastStore';

import { type AdminCustomer, adminCustomersApi, type CustomerAction } from '../api';
import { devicesPhrase, POINTS_LIMIT, POINTS_NOTE_MAX, pointsPhrase } from '../labels';
import { useAdjustPoints, useCustomerAction } from '../queries';

import local from './CustomerActions.module.css';

/** Ask first, then act: two buttons in place of one. */
function Confirmable({
  title,
  about,
  trigger,
  confirm,
  pending,
  danger = false,
  onConfirm,
}: {
  title: string;
  about: string;
  trigger: string;
  confirm: string;
  pending: boolean;
  danger?: boolean;
  onConfirm: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className={cx(styles.actionForm, confirming && danger && styles.danger)}>
      <p className={styles.actionTitle}>{title}</p>
      <p className={styles.muted}>{about}</p>
      <div className={styles.buttons}>
        {confirming ? (
          <>
            <Button
              variant={danger ? 'red' : 'ink'}
              size="sm"
              disabled={pending}
              onClick={onConfirm}
            >
              {pending ? 'جارٍ التنفيذ…' : confirm}
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
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setConfirming(true);
            }}
          >
            {trigger}
          </Button>
        )}
      </div>
    </div>
  );
}

function ActiveAction({ customer }: { customer: AdminCustomer }) {
  const deactivate = customer.isActive;
  const action = useCustomerAction(
    customer.id,
    () => adminCustomersApi.setActive(customer.id, !deactivate),
    deactivate ? 'أُوقف الحساب وسُجّل خروج العميل من كل أجهزته.' : 'أُعيد تفعيل الحساب.',
  );

  if (!deactivate) {
    return (
      <div className={styles.actionForm}>
        <p className={styles.actionTitle}>الحساب موقوف</p>
        <p className={styles.muted}>
          لا يستطيع العميل الدخول. إعادة التفعيل تسمح له بالدخول فوراً.
        </p>
        <div className={styles.buttons}>
          <Button
            variant="ink"
            size="sm"
            disabled={action.isPending}
            onClick={() => {
              action.mutate(undefined);
            }}
          >
            {action.isPending ? 'جارٍ التفعيل…' : 'إعادة تفعيل الحساب'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Confirmable
      title="إيقاف الحساب"
      about="لن يستطيع العميل الدخول، ويخرج من كل أجهزته خلال ١٥ دقيقة على الأكثر. طلباته ونقاطه تبقى كما هي، ويمكن إعادة التفعيل في أي وقت."
      trigger="إيقاف الحساب"
      confirm="نعم، أوقف الحساب"
      danger
      pending={action.isPending}
      onConfirm={() => {
        action.mutate(undefined);
      }}
    />
  );
}

function SignOutAction({ customer }: { customer: AdminCustomer }) {
  const action = useCustomerAction(
    customer.id,
    () => adminCustomersApi.signOutEverywhere(customer.id),
    'سُجّل خروج العميل من كل أجهزته.',
  );
  return (
    <Confirmable
      title="تسجيل الخروج من كل الأجهزة"
      about={`مسجّل الدخول الآن على ${devicesPhrase(customer.activity.activeSessions)}. يفيد إن فقد العميل جهازه أو شكّ في دخول غيره. يستطيع الدخول من جديد بكلمة مروره.`}
      trigger="تسجيل الخروج من كل الأجهزة"
      confirm="نعم، سجّل خروجه"
      pending={action.isPending}
      onConfirm={() => {
        action.mutate(undefined);
      }}
    />
  );
}

const COOLDOWN_SECONDS = 60;

function ResendAction({ customer }: { customer: AdminCustomer }) {
  const [wait, setWait] = useState(0);
  const action = useCustomerAction(
    customer.id,
    () => adminCustomersApi.resendVerification(customer.id),
    'أُرسل رابط تفعيل جديد إلى بريد العميل.',
  );

  useEffect(() => {
    if (wait <= 0) return;
    const timer = window.setTimeout(() => {
      setWait((value) => value - 1);
    }, 1000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [wait]);

  return (
    <div className={styles.actionForm}>
      <p className={styles.actionTitle}>إرسال رابط التفعيل</p>
      <p className={styles.muted}>
        لم يفعّل العميل بريده بعد. الرابط الجديد يُبطل الروابط السابقة.
      </p>
      <div className={styles.buttons}>
        <Button
          variant="ghost"
          size="sm"
          disabled={action.isPending || wait > 0}
          onClick={() => {
            action.mutate(undefined, {
              onSuccess: () => {
                setWait(COOLDOWN_SECONDS);
              },
            });
          }}
        >
          {action.isPending
            ? 'جارٍ الإرسال…'
            : wait > 0
              ? `أُرسل · أعد بعد ${formatCount(wait)} ث`
              : 'أرسل رابط التفعيل'}
        </Button>
      </div>
    </div>
  );
}

const newKey = () => crypto.randomUUID();

function AdjustPointsAction({ customer }: { customer: AdminCustomer }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  // One key per opened form: a double submit adds the points once (API §10b).
  const [key, setKey] = useState(newKey);
  const [submitted, setSubmitted] = useState(false);
  const adjust = useAdjustPoints(customer.id);
  const balance = customer.loyalty.balance;

  const digits = amount.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660));
  const value = /^\d+$/.test(digits) ? Number(digits) : 0;
  const amountError =
    value < 1
      ? 'اكتب عدد النقاط.'
      : value > POINTS_LIMIT
        ? `الحد الأقصى ${formatCount(POINTS_LIMIT)} نقطة في التعديل الواحد.`
        : mode === 'remove' && value > balance
          ? `الرصيد ${pointsPhrase(balance)} فقط، ولا يمكن أن يصبح سالباً.`
          : undefined;
  const noteError = note.trim() === '' ? 'اكتب سبب التعديل كما سيراه العميل.' : undefined;
  const points = mode === 'add' ? value : -value;

  const reset = () => {
    setOpen(false);
    setMode('add');
    setAmount('');
    setNote('');
    setSubmitted(false);
    setKey(newKey());
  };

  if (!open) {
    return (
      <div className={styles.actionForm}>
        <p className={styles.actionTitle}>تعديل النقاط</p>
        <p className={styles.muted}>
          تعويض أو تصحيح يدوي. الرصيد الآن {pointsPhrase(balance)}، ولا يتغيّر المستوى بالتعديل.
        </p>
        <div className={styles.buttons}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOpen(true);
            }}
          >
            تعديل النقاط
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className={styles.actionForm}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
        if (amountError || noteError || adjust.isPending) return;
        adjust.mutate(
          { points, note: note.trim(), key },
          {
            onSuccess: (loyalty) => {
              toast.success(
                `${mode === 'add' ? 'أُضيفت' : 'خُصمت'} ${pointsPhrase(value)}. الرصيد الآن ${pointsPhrase(loyalty.balance)}.`,
              );
              reset();
            },
          },
        );
      }}
    >
      <p className={styles.actionTitle}>تعديل النقاط</p>
      <div className={styles.filters} role="group" aria-label="نوع التعديل">
        {(
          [
            ['add', 'إضافة'],
            ['remove', 'خصم'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            className={cx(styles.filter, mode === value && styles.filterOn)}
            onClick={() => {
              setMode(value);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <TextField
        label="عدد النقاط"
        inputMode="numeric"
        autoComplete="off"
        maxLength={7}
        value={amount}
        error={submitted ? amountError : undefined}
        hint={
          value > 0 && !amountError
            ? `الرصيد بعد التعديل: ${pointsPhrase(balance + points)}`
            : `الرصيد الحالي: ${pointsPhrase(balance)}`
        }
        onChange={(event) => {
          setAmount(event.target.value.replace(/[^\d٠-٩]/g, ''));
        }}
      />
      <TextAreaField
        label="السبب (يظهر للعميل في سجل نقاطه)"
        rows={2}
        maxLength={POINTS_NOTE_MAX}
        placeholder="مثلاً: تعويض عن تأخر الشحنة"
        value={note}
        error={submitted ? noteError : undefined}
        onChange={(event) => {
          setNote(event.target.value);
        }}
      />
      <div className={styles.buttons}>
        <Button type="submit" variant="ink" size="sm" disabled={adjust.isPending}>
          {adjust.isPending ? 'جارٍ الحفظ…' : 'حفظ التعديل'}
        </Button>
        <Button variant="ghost" size="sm" onClick={reset}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}

/** The action card, built from allowedActions only (API §10b). */
export function CustomerActions({ customer }: { customer: AdminCustomer }) {
  const can = (action: CustomerAction) => customer.allowedActions.includes(action);

  if (customer.allowedActions.length === 0) {
    return (
      <p className={styles.muted}>
        {customer.isAnonymized
          ? 'حذف العميل حسابه بنفسه، فبياناته محذوفة ولا يمكن تعديل الحساب. تبقى طلباته للفواتير.'
          : 'لا إجراءات متاحة لهذا الحساب.'}
      </p>
    );
  }

  return (
    <div className={local.stack}>
      {can('ResendVerification') && <ResendAction customer={customer} />}
      {can('AdjustPoints') && <AdjustPointsAction customer={customer} />}
      {can('SignOutEverywhere') && <SignOutAction customer={customer} />}
      {(can('Deactivate') || can('Activate')) && <ActiveAction customer={customer} />}
    </div>
  );
}