import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';

import { paths } from '@/app/paths';
import { accountApi } from '@/features/account/api';
import { AccountHeader } from '@/features/account/components/AccountHeader';
import shared from '@/features/account/components/account.module.css';
import {
  type DeleteValues,
  deleteSchema,
  type PasswordValues,
  passwordSchema,
  type ProfileValues,
  profileSchema,
} from '@/features/account/schemas';
import { PASSWORD_MIN } from '@/features/auth/schemas';
import { endSessionLocally, updateSessionCustomer, useSession } from '@/features/auth/session';
import type { Customer } from '@/features/auth/types';
import { ApiError } from '@/shared/api/ApiError';
import { errorMessage } from '@/shared/api/errorMessages';
import { formatCount, formatDate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { Checkbox, FormAlert, PasswordField, TextField } from '@/shared/ui/form/Field';
import { toast } from '@/shared/ui/toast/toastStore';

import styles from './AccountSecurityPage.module.css';

function ProfileCard({ customer }: { customer: Customer }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone ?? '',
      acceptsMarketingEmails: customer.acceptsMarketingEmails,
    },
    mode: 'onTouched',
  });

  const save = useMutation({
    mutationFn: (values: ProfileValues) =>
      accountApi.updateProfile({ ...values, phone: values.phone === '' ? null : values.phone }),
    onSuccess: (updated) => {
      updateSessionCustomer(updated);
      reset({
        firstName: updated.firstName,
        lastName: updated.lastName,
        phone: updated.phone ?? '',
        acceptsMarketingEmails: updated.acceptsMarketingEmails,
      });
      toast.success('حُفظت بياناتك.');
    },
  });

  return (
    <form
      className={shared.card}
      aria-labelledby="profile-title"
      noValidate
      onSubmit={(event) => {
        void handleSubmit((values) => {
          save.mutate(values);
        })(event);
      }}
    >
      <h2 id="profile-title" className={shared.cardTitle}>
        بياناتي
      </h2>
      <p className={shared.muted}>
        البريد الإلكتروني: <b dir="ltr">{customer.email}</b> · عضو منذ{' '}
        {formatDate(customer.createdAtUtc)}
      </p>
      {save.isError && <FormAlert>{errorMessage(save.error)}</FormAlert>}
      <div className={styles.twoCols}>
        <TextField
          label="الاسم"
          autoComplete="given-name"
          error={errors.firstName?.message}
          {...register('firstName')}
        />
        <TextField
          label="اسم العائلة"
          autoComplete="family-name"
          error={errors.lastName?.message}
          {...register('lastName')}
        />
      </div>
      <TextField
        label="رقم الجوال (اختياري)"
        type="tel"
        dir="ltr"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+90 5xx xxx xx xx"
        hint="نملأ به خانة الجوال عند الدفع."
        error={errors.phone?.message}
        {...register('phone')}
      />
      <Checkbox {...register('acceptsMarketingEmails')}>
        أرسلوا لي الإصدارات الجديدة والعروض بالبريد الإلكتروني
      </Checkbox>
      <Button
        type="submit"
        variant="ink"
        className={styles.submit}
        disabled={!isDirty || save.isPending}
      >
        {save.isPending ? 'جارٍ الحفظ…' : 'حفظ التغييرات'}
      </Button>
    </form>
  );
}

function PasswordCard() {
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    mode: 'onTouched',
  });

  const change = useMutation({
    mutationFn: (values: PasswordValues) =>
      accountApi.changePassword(values.currentPassword, values.newPassword),
    onSuccess: () => {
      setDone(true);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'Customer.CurrentPasswordIncorrect') {
        setError('currentPassword', { message: errorMessage(error) });
      }
    },
  });

  if (done) {
    // The server has already ended every session, this one included (API §7).
    return (
      <section className={shared.card} aria-labelledby="password-title">
        <h2 id="password-title" className={shared.cardTitle}>
          تم تغيير كلمة المرور
        </h2>
        <p>سجّلنا خروجك من كل الأجهزة حفاظاً على أمان حسابك. سجّل الدخول بكلمة المرور الجديدة.</p>
        <Button
          variant="ink"
          className={styles.submit}
          onClick={() => {
            endSessionLocally();
          }}
        >
          تسجيل الدخول
        </Button>
      </section>
    );
  }

  const incorrect =
    change.error instanceof ApiError && change.error.code === 'Customer.CurrentPasswordIncorrect';

  return (
    <form
      className={shared.card}
      aria-labelledby="password-title"
      noValidate
      onSubmit={(event) => {
        void handleSubmit((values) => {
          change.mutate(values);
        })(event);
      }}
    >
      <h2 id="password-title" className={shared.cardTitle}>
        تغيير كلمة المرور
      </h2>
      <p className={shared.muted}>بعد التغيير نسجّل خروجك من كل الأجهزة، وهذا الجهاز منها.</p>
      {change.isError && !incorrect && <FormAlert>{errorMessage(change.error)}</FormAlert>}
      <PasswordField
        label="كلمة المرور الحالية"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...register('currentPassword')}
      />
      <div className={styles.twoCols}>
        <PasswordField
          label="كلمة المرور الجديدة"
          autoComplete="new-password"
          hint={`${formatCount(PASSWORD_MIN)} حرفاً على الأقل`}
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <PasswordField
          label="تأكيد كلمة المرور"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
      </div>
      <Button type="submit" variant="ink" className={styles.submit} disabled={change.isPending}>
        {change.isPending ? 'جارٍ التغيير…' : 'تغيير كلمة المرور'}
      </Button>
    </form>
  );
}

function DeleteCard() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DeleteValues>({
    resolver: zodResolver(deleteSchema),
    defaultValues: { password: '', confirm: false },
    mode: 'onTouched',
  });

  const remove = useMutation({
    mutationFn: (values: DeleteValues) => accountApi.deleteAccount(values.password),
    onSuccess: () => {
      // Leave «حسابي» first, so the guard doesn't send us to the login page.
      void navigate(paths.home, { replace: true });
      endSessionLocally();
      toast.success('حُذف حسابك. نتمنى أن نراك مجدداً.');
    },
  });

  return (
    <form
      className={styles.danger}
      aria-labelledby="delete-title"
      noValidate
      onSubmit={(event) => {
        void handleSubmit((values) => {
          remove.mutate(values);
        })(event);
      }}
    >
      <h2 id="delete-title" className={shared.cardTitle}>
        حذف الحساب
      </h2>
      <p className={styles.dangerText}>
        الحذف نهائي ولا يمكن التراجع عنه: تُحذف عناوينك ومفضلتك ومراجعاتك، وتبقى طلباتك محفوظة دون
        بياناتك الشخصية لأغراض الفوترة.
      </p>
      {remove.isError && <FormAlert>{errorMessage(remove.error)}</FormAlert>}
      <PasswordField
        label="كلمة المرور للتأكيد"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <Checkbox {...register('confirm')}>أفهم أن حذف الحساب نهائي</Checkbox>
      {errors.confirm?.message && <p className={styles.error}>{errors.confirm.message}</p>}
      <Button type="submit" variant="red" className={styles.submit} disabled={remove.isPending}>
        {remove.isPending ? 'جارٍ الحذف…' : 'حذف حسابي نهائياً'}
      </Button>
    </form>
  );
}

/** «الحساب والأمان» (API §7): profile, password, account deletion (KVKK). */
export default function AccountSecurityPage() {
  const { customer } = useSession();
  if (!customer) return null;
  return (
    <>
      <AccountHeader title="الحساب والأمان" />
      <ProfileCard key={customer.id} customer={customer} />
      <PasswordCard />
      <DeleteCard />
    </>
  );
}
