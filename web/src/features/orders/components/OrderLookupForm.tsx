import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { OrderLookup } from '@/features/orders/types';
import { Button } from '@/shared/ui/Button/Button';
import { FormAlert, TextField } from '@/shared/ui/form/Field';

import styles from './OrderLookupForm.module.css';

const schema = z.object({
  orderNumber: z
    .string()
    .trim()
    .min(1, 'أدخل رقم الطلب')
    .max(50, 'رقم الطلب غير صحيح')
    .transform((value) => value.toUpperCase()),
  email: z.string().trim().pipe(z.email('أدخل بريداً إلكترونياً صحيحاً')),
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
          label="رقم الطلب"
          dir="ltr"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="BK-3F9A1C22D0"
          hint="تجده في رسالة تأكيد الطلب."
          error={errors.orderNumber?.message}
          {...register('orderNumber')}
        />
        <TextField
          label="البريد الإلكتروني"
          type="email"
          dir="ltr"
          inputMode="email"
          autoComplete="email"
          placeholder="name@example.com"
          hint="البريد الذي استخدمته عند الطلب."
          error={errors.email?.message}
          {...register('email')}
        />
      </div>
      <Button type="submit" variant="ink" disabled={busy} className={styles.submit}>
        {busy ? 'جارٍ البحث…' : submitLabel}
      </Button>
    </form>
  );
}
