import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { STORE_COUNTRY } from '@/app/locale';
import type { AddressInput, SavedAddress } from '@/features/addresses/api';
import { type AddressValues, addressSchema } from '@/features/addresses/schema';
import { CountrySelect } from '@/features/checkout/components/ShippingChoice';
import { serverFieldErrors } from '@/shared/api/formErrors';
import { errorMessage } from '@/shared/api/errorMessages';
import { Button } from '@/shared/ui/Button/Button';
import { Checkbox, FormAlert, TextField } from '@/shared/ui/form/Field';

import styles from './AddressForm.module.css';

interface AddressFormProps {
  /** null = a new address. */
  address: SavedAddress | null;
  /** First address: it becomes the default anyway, so the box is hidden. */
  isFirst: boolean;
  defaults?: { recipientName: string; phone: string };
  busy: boolean;
  error: unknown;
  onSubmit: (address: AddressInput, isDefault: boolean) => void;
  onCancel: () => void;
}

type AddressField = keyof AddressInput;

/** Add or edit one saved address (API §7). */
export function AddressForm({
  address,
  isFirst,
  defaults,
  busy,
  error,
  onSubmit,
  onCancel,
}: AddressFormProps) {
  const { t } = useTranslation('account', { keyPrefix: 'addresses' });
  const { t: tShared } = useTranslation('account', { keyPrefix: 'shared' });
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: address?.label ?? '',
      recipientName: address?.recipientName ?? defaults?.recipientName ?? '',
      phone: address?.phone ?? defaults?.phone ?? '',
      line1: address?.line1 ?? '',
      line2: address?.line2 ?? '',
      city: address?.city ?? '',
      stateOrProvince: address?.stateOrProvince ?? '',
      postalCode: address?.postalCode ?? '',
      countryCode: address?.countryCode ?? STORE_COUNTRY,
      isDefault: false,
    },
    mode: 'onTouched',
  });

  const fieldErrors = serverFieldErrors(error);
  const serverError = (name: AddressField) => fieldErrors[`address.${name}`];
  const generalError = error && Object.keys(fieldErrors).length === 0 ? errorMessage(error) : null;
  const country = useWatch({ control, name: 'countryCode' });

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        void handleSubmit((values) => {
          const optional = (value: string) => (value === '' ? null : value);
          onSubmit(
            {
              label: values.label,
              recipientName: values.recipientName,
              phone: values.phone,
              line1: values.line1,
              line2: optional(values.line2),
              city: values.city,
              stateOrProvince: optional(values.stateOrProvince),
              postalCode: values.postalCode,
              countryCode: values.countryCode,
            },
            values.isDefault,
          );
        })(event);
      }}
    >
      <h2 className={styles.title}>{address ? t('form.editTitle') : t('form.newTitle')}</h2>
      {generalError && <FormAlert>{generalError}</FormAlert>}

      <div className={styles.fields}>
        <TextField
          className={styles.full}
          label={t('form.label')}
          placeholder={t('form.labelPlaceholder')}
          maxLength={50}
          error={errors.label?.message ?? serverError('label')}
          {...register('label')}
        />
        <TextField
          label={t('form.recipient')}
          autoComplete="name"
          error={errors.recipientName?.message ?? serverError('recipientName')}
          {...register('recipientName')}
        />
        <TextField
          label={t('form.phone')}
          type="tel"
          dir="ltr"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+90 5xx xxx xx xx"
          error={errors.phone?.message ?? serverError('phone')}
          {...register('phone')}
        />
        <div className={styles.full}>
          <label htmlFor="address-country" className={styles.label}>
            {t('form.country')}
          </label>
          <Controller
            control={control}
            name="countryCode"
            render={({ field }) => (
              <CountrySelect id="address-country" value={field.value} onChange={field.onChange} />
            )}
          />
        </div>
        <TextField
          className={styles.full}
          label={t('form.line1')}
          autoComplete="address-line1"
          placeholder={t('form.line1Placeholder')}
          error={errors.line1?.message ?? serverError('line1')}
          {...register('line1')}
        />
        <TextField
          className={styles.full}
          label={t('form.line2')}
          autoComplete="address-line2"
          error={errors.line2?.message ?? serverError('line2')}
          {...register('line2')}
        />
        <TextField
          label={t('form.city')}
          autoComplete="address-level2"
          error={errors.city?.message ?? serverError('city')}
          {...register('city')}
        />
        <TextField
          label={t('form.state')}
          autoComplete="address-level1"
          error={errors.stateOrProvince?.message ?? serverError('stateOrProvince')}
          {...register('stateOrProvince')}
        />
        <TextField
          label={t('form.postal')}
          dir="ltr"
          inputMode={country === STORE_COUNTRY ? 'numeric' : 'text'}
          autoComplete="postal-code"
          error={errors.postalCode?.message ?? serverError('postalCode')}
          {...register('postalCode')}
        />
      </div>

      {!address && !isFirst && (
        <Checkbox {...register('isDefault')}>{t('form.makeDefault')}</Checkbox>
      )}

      <div className={styles.actions}>
        <Button type="submit" variant="ink" disabled={busy}>
          {busy ? tShared('saving') : t('form.save')}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {tShared('cancel')}
        </Button>
      </div>
    </form>
  );
}