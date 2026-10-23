import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import form from '@/features/admin/books/components/BookEditor.module.css';
import { RecordStatus } from '@/features/admin/components/RecordStatus';
import { endOfStoreDay, storeDayOf, storeToday } from '@/features/admin/dates';
import { serverFieldErrors } from '@/shared/api/formErrors';
import { Button } from '@/shared/ui/Button/Button';
import { TextField } from '@/shared/ui/form/Field';

import { type AdminCoupon, adminCouponsApi } from '../api';
import { timesPhrase, usageText } from '../labels';
import { useCouponMutation } from '../queries';

const couponSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{3,50}$/, 'من ٣ إلى ٥٠ حرفاً لاتينياً أو رقماً، ويُسمح بـ - و _'),
  discountPercentage: z
    .string()
    .trim()
    .regex(/^\d+$/, 'أدخل رقماً صحيحاً')
    .refine((value) => Number(value) >= 1 && Number(value) <= 100, {
      message: 'بين ١ و١٠٠',
    }),
  /** Istanbul day; the coupon works until its last second. */
  expiresOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'اختر تاريخ الانتهاء')
    .refine((day) => day >= storeToday(), { message: 'اختر اليوم أو تاريخاً لاحقاً' }),
  /** '' = no limit. */
  maxRedemptions: z
    .string()
    .trim()
    .regex(/^\d*$/, 'أدخل رقماً صحيحاً')
    .refine((value) => value === '' || Number(value) >= 1, { message: 'واحد على الأقل' }),
});

type CouponValues = z.infer<typeof couponSchema>;

interface CouponFormProps {
  /** null = a new coupon. */
  coupon: AdminCoupon | null;
  onSaved: (id: number) => void;
  onDeleted: () => void;
}

/** One discount code (API §10 /admin/coupons). The code itself is fixed once created. */
export function CouponForm({ coupon, onSaved, onDeleted }: CouponFormProps) {
  const creating = coupon === null;
  const id = coupon?.id ?? 0;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<CouponValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: coupon
      ? {
          code: coupon.code,
          discountPercentage: String(coupon.discountPercentage),
          expiresOn: storeDayOf(coupon.expiresAtUtc),
          maxRedemptions: coupon.maxRedemptions === null ? '' : String(coupon.maxRedemptions),
        }
      : { code: '', discountPercentage: '10', expiresOn: '', maxRedemptions: '' },
    mode: 'onTouched',
  });

  const save = useCouponMutation(
    (values: CouponValues) => {
      const input = {
        discountPercentage: Number(values.discountPercentage),
        expiresAtUtc: endOfStoreDay(values.expiresOn),
        maxRedemptions: values.maxRedemptions === '' ? null : Number(values.maxRedemptions),
      };
      return coupon
        ? adminCouponsApi.update(coupon.id, input)
        : adminCouponsApi.create({ ...input, code: values.code.trim().toUpperCase() });
    },
    creating ? 'أُنشئ الكوبون.' : 'حُفظ الكوبون.',
  );
  const toggle = useCouponMutation(
    (isActive: boolean) => adminCouponsApi.setActive(id, isActive),
    coupon?.isActive ? 'أُوقف الكوبون.' : 'فُعّل الكوبون.',
  );
  const remove = useCouponMutation(() => adminCouponsApi.remove(id), 'حُذف الكوبون.');

  const server = serverFieldErrors(save.error);
  const fieldError = (name: keyof CouponValues) =>
    errors[name]?.message ??
    server[name] ??
    (name === 'expiresOn' ? server.expiresAtUtc : undefined);

  return (
    <div className={form.stack}>
      <form
        noValidate
        className={form.form}
        onSubmit={(event) => {
          void handleSubmit((values) => {
            if (
              coupon &&
              values.maxRedemptions !== '' &&
              Number(values.maxRedemptions) < coupon.timesRedeemed
            ) {
              setError('maxRedemptions', {
                message: `استُخدم ${timesPhrase(coupon.timesRedeemed)}؛ لا يقل الحد عن ذلك.`,
              });
              return;
            }
            save.mutate(values, {
              onSuccess: (saved) => {
                onSaved(saved.id);
              },
            });
          })(event);
        }}
      >
        {creating ? (
          <TextField
            label="الكود"
            hint="أحرف لاتينية وأرقام، يُحفظ بأحرف كبيرة، ولا يتغير بعد الإنشاء."
            dir="ltr"
            autoCapitalize="characters"
            spellCheck={false}
            error={fieldError('code')}
            {...register('code')}
          />
        ) : (
          <dl className={form.fixed}>
            <div>
              <dt>الكود</dt>
              <dd dir="ltr">{coupon.code}</dd>
            </div>
            <div>
              <dt>الاستخدام</dt>
              <dd>{usageText(coupon)}</dd>
            </div>
          </dl>
        )}
        <div className={form.grid}>
          <TextField
            label="الخصم (%)"
            dir="ltr"
            inputMode="numeric"
            error={fieldError('discountPercentage')}
            {...register('discountPercentage')}
          />
          <TextField
            label="آخر يوم للاستخدام"
            hint="يعمل حتى نهاية هذا اليوم بتوقيت إسطنبول."
            type="date"
            dir="ltr"
            error={fieldError('expiresOn')}
            {...register('expiresOn')}
          />
        </div>
        <TextField
          label="حد الاستخدام (اختياري)"
          hint={
            coupon && coupon.timesRedeemed > 0
              ? `اتركه فارغاً بلا حد. استُخدم حتى الآن ${timesPhrase(coupon.timesRedeemed)}.`
              : 'كم مرة يمكن استخدامه إجمالاً. اتركه فارغاً بلا حد.'
          }
          dir="ltr"
          inputMode="numeric"
          error={fieldError('maxRedemptions')}
          {...register('maxRedemptions')}
        />
        <div className={form.actions}>
          <Button type="submit" variant="ink" disabled={save.isPending || (!creating && !isDirty)}>
            {save.isPending ? 'جارٍ الحفظ…' : creating ? 'إنشاء الكوبون' : 'حفظ الكوبون'}
          </Button>
        </div>
      </form>

      {coupon && (
        <RecordStatus
          isActive={coupon.isActive}
          labels={{
            on: 'الكوبون مفعّل',
            off: 'الكوبون موقوف',
            hide: 'إيقاف',
            show: 'تفعيل',
            offEffect: 'لا يُقبل عند الدفع حتى تفعّله، ويبقى سجل استخدامه.',
          }}
          hideEffect="الإيقاف يمنع استخدامه فوراً، ويبقى سجل استخدامه."
          onToggle={(next) => {
            toggle.mutate(next);
          }}
          toggling={toggle.isPending}
          deleteBlocked={
            coupon.timesRedeemed > 0
              ? `استُخدم ${timesPhrase(coupon.timesRedeemed)}، ويبقى للتقارير. أوقفه بدلاً من حذفه.`
              : null
          }
          onDelete={() => {
            remove.mutate(undefined, { onSuccess: onDeleted });
          }}
          deleting={remove.isPending}
        />
      )}
    </div>
  );
}