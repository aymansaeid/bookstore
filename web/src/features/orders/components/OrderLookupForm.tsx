import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import type { OrderLookup } from '@/features/orders/types';
import { i18n } from '@/i18n';
import { Button } from '@/shared/ui/Button/Button';
import { FormAlert, TextField } from '@/shared/ui/form/Field';

import styles from './OrderLookupForm.module.css';

/** Looked up when a check fails, so messages follow the page's language. */
const say = (key: 'numberRequired' | 'numberInvalid' | 'email') => ({
  error: () => i18n.t(`lookup.${key}`, { ns: 'orders' }),
});

const schema = z.object({
  orderNumber: z
    .string()
    .trim()
    .min(1, say('numberRequired'))
    .max(50, say('numberInvalid'))
    .transform((value) => value.toUpperCase()),
  email: z
    .string()
    .trim()
    .pipe(z.email(say('email'))),
});

type LookupInput = z.input<typeof schema>;

interface OrderLookupFormProps {
  defaults: { orderNumber: string; email: string };
  onLookup: (lookup: OrderLookup) => void;
  submitLabel: string;
  busy?: boolean;
  error?: string | null;
}

/** Order number + email, the only way guests reach an order (API §6, §9). */
export function OrderLookupForm({
  defaults,
  onLookup,
  submitLabel,
  busy = false,
  error = null,
}: OrderLookupFormProps) {
  const { t } = useTranslation('orders', { keyPrefix: 'lookup' });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LookupInput, unknown, OrderLookup>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
    mode: 'onTouched',
  });

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        void handleSubmit(onLookup)(event);
      }}
    >
      {error && <FormAlert>{error}</FormAlert>}
      <div className={styles.fields}>
        <TextField
          label={t('number')}
          dir="ltr"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="BK-3F9A1C22D0"
          hint={t('numberHint')}
          error={errors.orderNumber?.message}
          {...register('orderNumber')}
        />
        <TextField
          label={t('emailLabel')}
          type="email"
          dir="ltr"
          inputMode="email"
          autoComplete="email"
          placeholder="name@example.com"
          hint={t('emailHint')}
          error={errors.email?.message}
          {...register('email')}
        />
      </div>
      <Button type="submit" variant="ink" disabled={busy} className={styles.submit}>
        {busy ? t('searching') : submitLabel}
      </Button>
    </form>
  );
}