import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import form from '@/features/admin/books/components/BookEditor.module.css';
import { serverFieldErrors } from '@/shared/api/formErrors';
import { Button } from '@/shared/ui/Button/Button';
import { TextField } from '@/shared/ui/form/Field';

import { type AdminShippingZone, adminShippingApi, SHIPPING_LIMITS } from '../api';
import { useZoneMutation } from '../queries';
import { zoneInput, zoneSchema, type ZoneValues, zoneValues } from '../schema';

import { CountryPicker } from './CountryPicker';

interface ZoneFormProps {
  /** null = a new zone. */
  zone: AdminShippingZone | null;
  /** Countries in the other zones → zone name. */
  taken: ReadonlyMap<string, string>;
  onSaved: (id: number) => void;
}

/** Name, flat rate and countries (API §10 POST/PUT /shipping-zones). */
export function ZoneForm({ zone, taken, onSaved }: ZoneFormProps) {
  const creating = zone === null;
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ZoneValues>({
    resolver: zodResolver(zoneSchema),
    defaultValues: zoneValues(zone),
    mode: 'onTouched',
  });

  const save = useZoneMutation(
    (values: ZoneValues) =>
      zone
        ? adminShippingApi.update(zone.id, zoneInput(values))
        : adminShippingApi.create(zoneInput(values)),
    creating ? 'أُضيفت منطقة الشحن.' : 'حُفظت منطقة الشحن.',
  );

  const server = serverFieldErrors(save.error);
  const countryError =
    errors.countryCodes?.message ??
    (Object.keys(server).some((key) => key.startsWith('countryCodes'))
      ? 'أحد رموز الدول غير صالح.'
      : undefined);

  return (
    <form
      noValidate
      className={form.form}
      onSubmit={(event) => {
        void handleSubmit((values) => {
          save.mutate(values, {
            onSuccess: (saved) => {
              onSaved(saved.id);
            },
          });
        })(event);
      }}
    >
      <div className={form.grid}>
        <TextField
          label="اسم المنطقة"
          hint="للإدارة فقط، مثل «تركيا» أو «أوروبا»."
          maxLength={SHIPPING_LIMITS.name}
          error={errors.name?.message ?? server.name}
          {...register('name')}
        />
        <TextField
          label="سعر الشحن العادي (₺)"
          hint="٠ = شحن مجاني دائماً."
          dir="ltr"
          inputMode="decimal"
          error={errors.flatRate?.message ?? server.flatRate}
          {...register('flatRate')}
        />
      </div>
      <Controller
        control={control}
        name="countryCodes"
        render={({ field }) => (
          <CountryPicker
            value={field.value}
            onChange={field.onChange}
            taken={taken}
            error={countryError}
          />
        )}
      />
      <div className={form.actions}>
        <Button type="submit" variant="ink" disabled={save.isPending || (!creating && !isDirty)}>
          {save.isPending ? 'جارٍ الحفظ…' : creating ? 'إضافة المنطقة' : 'حفظ المنطقة'}
        </Button>
        {creating && (
          <p className={form.note}>بعد الإضافة تضبط شركة الشحن ومدة التوصيل والخيارات الإضافية.</p>
        )}
      </div>
    </form>
  );
}