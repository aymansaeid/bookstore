import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';

import form from '@/features/admin/books/components/BookEditor.module.css';
import { serverFieldErrors } from '@/shared/api/formErrors';
import { formatCount, formatMoney } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { TextField } from '@/shared/ui/form/Field';

import { type AdminShippingZone, adminShippingApi, SHIPPING_LIMITS } from '../api';
import { useZoneMutation } from '../queries';
import {
  deliveryInput,
  deliverySchema,
  type DeliveryValues,
  deliveryValues,
  emptyOption,
} from '../schema';

import local from './Shipping.module.css';

type OptionField = 'code' | 'name' | 'carrier' | 'price' | 'minDays' | 'maxDays';

/**
 * Standard delivery (carrier, days), the free-shipping threshold and up to five
 * paid extras such as express (API §10 PUT /shipping-zones/{id}/delivery).
 */
export function DeliveryForm({ zone }: { zone: AdminShippingZone }) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<DeliveryValues>({
    resolver: zodResolver(deliverySchema),
    defaultValues: deliveryValues(zone),
    mode: 'onTouched',
  });
  const options = useFieldArray({ control, name: 'options' });

  const save = useZoneMutation(
    (values: DeliveryValues) => adminShippingApi.setDelivery(zone.id, deliveryInput(values)),
    'حُفظت تفاصيل التوصيل.',
  );

  const server = serverFieldErrors(save.error);
  const fieldError = (name: Exclude<keyof DeliveryValues, 'options'>) =>
    errors[name]?.message ?? server[name];
  const optionError = (index: number, name: OptionField) =>
    errors.options?.[index]?.[name]?.message ?? server[`options.${String(index)}.${name}`];

  return (
    <form
      noValidate
      className={form.form}
      onSubmit={(event) => {
        void handleSubmit((values) => {
          save.mutate(values);
        })(event);
      }}
    >
      <fieldset className={form.fieldset}>
        <legend className={form.legend}>
          الشحن العادي ({formatMoney(zone.flatRate, zone.currency)})
        </legend>
        <TextField
          label="شركة الشحن (اختياري)"
          hint="تظهر للعميل عند الدفع، مثل «PTT Kargo» أو «Aramex»."
          maxLength={SHIPPING_LIMITS.carrier}
          error={fieldError('standardCarrier')}
          {...register('standardCarrier')}
        />
        <div className={form.grid}>
          <TextField
            label="أقل مدة (أيام)"
            dir="ltr"
            inputMode="numeric"
            error={fieldError('standardMinDays')}
            {...register('standardMinDays')}
          />
          <TextField
            label="أكثر مدة (أيام)"
            dir="ltr"
            inputMode="numeric"
            error={fieldError('standardMaxDays')}
            {...register('standardMaxDays')}
          />
        </div>
        <TextField
          label="شحن مجاني فوق (₺، اختياري)"
          hint="إذا بلغ مجموع الكتب بعد الخصم هذا المبلغ صار الشحن العادي مجانياً. اتركه فارغاً لإيقافه."
          dir="ltr"
          inputMode="decimal"
          error={fieldError('freeShippingThreshold')}
          {...register('freeShippingThreshold')}
        />
      </fieldset>

      <fieldset className={form.fieldset}>
        <legend className={form.legend}>
          خيارات إضافية مدفوعة ({formatCount(options.fields.length)} /{' '}
          {formatCount(SHIPPING_LIMITS.maxOptions)})
        </legend>
        <p className={form.note}>
          مثل الشحن السريع. يختارها العميل عند الدفع بدلاً من الشحن العادي، ولا يشملها الشحن
          المجاني.
        </p>
        {errors.options?.root?.message && (
          <p className={local.error} role="alert">
            {errors.options.root.message}
          </p>
        )}
        <ol className={local.options}>
          {options.fields.map((field, index) => (
            <li key={field.id} className={local.option}>
              <div className={local.optionHead}>
                <p className={local.optionTitle}>الخيار {formatCount(index + 1)}</p>
                <button
                  type="button"
                  className={form.iconButton}
                  aria-label={`حذف الخيار ${formatCount(index + 1)}`}
                  onClick={() => {
                    options.remove(index);
                  }}
                >
                  ×
                </button>
              </div>
              <div className={form.grid}>
                <TextField
                  label="الاسم للعميل"
                  maxLength={SHIPPING_LIMITS.optionName}
                  error={optionError(index, 'name')}
                  {...register(`options.${index}.name`)}
                />
                <TextField
                  label="الرمز"
                  hint="حروف لاتينية صغيرة، مثل express."
                  dir="ltr"
                  autoCapitalize="none"
                  spellCheck={false}
                  error={optionError(index, 'code')}
                  {...register(`options.${index}.code`)}
                />
                <TextField
                  label="السعر (₺)"
                  dir="ltr"
                  inputMode="decimal"
                  error={optionError(index, 'price')}
                  {...register(`options.${index}.price`)}
                />
                <TextField
                  label="شركة الشحن (اختياري)"
                  maxLength={SHIPPING_LIMITS.carrier}
                  error={optionError(index, 'carrier')}
                  {...register(`options.${index}.carrier`)}
                />
                <TextField
                  label="أقل مدة (أيام)"
                  dir="ltr"
                  inputMode="numeric"
                  error={optionError(index, 'minDays')}
                  {...register(`options.${index}.minDays`)}
                />
                <TextField
                  label="أكثر مدة (أيام)"
                  dir="ltr"
                  inputMode="numeric"
                  error={optionError(index, 'maxDays')}
                  {...register(`options.${index}.maxDays`)}
                />
              </div>
            </li>
          ))}
        </ol>
        <Button
          variant="ghost"
          size="sm"
          className={local.add}
          disabled={options.fields.length >= SHIPPING_LIMITS.maxOptions}
          onClick={() => {
            options.append(emptyOption);
          }}
        >
          + إضافة خيار
        </Button>
      </fieldset>

      <div className={form.actions}>
        <Button type="submit" variant="ink" disabled={save.isPending || !isDirty}>
          {save.isPending ? 'جارٍ الحفظ…' : 'حفظ تفاصيل التوصيل'}
        </Button>
      </div>
    </form>
  );
}