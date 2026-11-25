import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import {
  ENABLED_LANGUAGES,
  isUiLanguage,
  LANGUAGE_NAMES,
  UI_LANGUAGE,
  type UiLanguage,
} from '@/app/locale';
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
import { Checkbox, FormAlert, PasswordField, SelectField, TextField } from '@/shared/ui/form/Field';
import { toast } from '@/shared/ui/toast/toastStore';

import styles from './AccountSecurityPage.module.css';

/** The account's email language; older profiles without one get the page's language. */
const emailLanguage = (customer: Customer): UiLanguage =>
  isUiLanguage(customer.preferredLanguage) ? customer.preferredLanguage : UI_LANGUAGE;

const profileDefaults = (customer: Customer): ProfileValues => ({
  firstName: customer.firstName,
  lastName: customer.lastName,
  phone: customer.phone ?? '',
  acceptsMarketingEmails: customer.acceptsMarketingEmails,
  preferredLanguage: emailLanguage(customer),
});

function ProfileCard({ customer }: { customer: Customer }) {
  const { t } = useTranslation('account', { keyPrefix: 'security.profile' });
  const { t: tShared } = useTranslation('account', { keyPrefix: 'shared' });
  // Offer every enabled language, plus the saved one if it's no longer enabled.
  const languages = ENABLED_LANGUAGES.includes(emailLanguage(customer))
    ? ENABLED_LANGUAGES
    : [...ENABLED_LANGUAGES, emailLanguage(customer)];
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileDefaults(customer),
    mode: 'onTouched',
  });

  const save = useMutation({
    mutationFn: (values: ProfileValues) =>
      accountApi.updateProfile({ ...values, phone: values.phone === '' ? null : values.phone }),
    onSuccess: (updated) => {
      updateSessionCustomer(updated);
      reset(profileDefaults(updated));
      toast.success(t('saved'));
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
        {t('title')}
      </h2>
      <p className={shared.muted}>
        <Trans
          t={t}
          i18nKey="emailLine"
          values={{ email: customer.email, date: formatDate(customer.createdAtUtc) }}
          components={{ b: <b dir="ltr" /> }}
        />
      </p>
      {save.isError && <FormAlert>{errorMessage(save.error)}</FormAlert>}
      <div className={styles.twoCols}>
        <TextField
          label={t('firstName')}
          autoComplete="given-name"
          error={errors.firstName?.message}
          {...register('firstName')}
        />
        <TextField
          label={t('lastName')}
          autoComplete="family-name"
          error={errors.lastName?.message}
          {...register('lastName')}
        />
      </div>
      <TextField
        label={t('phone')}
        type="tel"
        dir="ltr"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+90 5xx xxx xx xx"
        hint={t('phoneHint')}
        error={errors.phone?.message}
        {...register('phone')}
      />
      {languages.length > 1 && (
        <SelectField
          label={t('emailLanguage')}
          hint={t('emailLanguageHint')}
          error={errors.preferredLanguage?.message}
          {...register('preferredLanguage')}
        >
          {languages.map((language) => (
            <option key={language} value={language} lang={language}>
              {LANGUAGE_NAMES[language]}
            </option>
          ))}
        </SelectField>
      )}
      <Checkbox {...register('acceptsMarketingEmails')}>{t('marketing')}</Checkbox>
      <Button
        type="submit"
        variant="ink"
        className={styles.submit}
        disabled={!isDirty || save.isPending}
      >
        {save.isPending ? tShared('saving') : t('save')}
      </Button>
    </form>
  );
}

function PasswordCard() {
  const { t } = useTranslation('account', { keyPrefix: 'security.password' });
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
          {t('doneTitle')}
        </h2>
        <p>{t('doneText')}</p>
        <Button
          variant="ink"
          className={styles.submit}
          onClick={() => {
            endSessionLocally();
          }}
        >
          {t('signIn')}
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
        {t('title')}
      </h2>
      <p className={shared.muted}>{t('lead')}</p>
      {change.isError && !incorrect && <FormAlert>{errorMessage(change.error)}</FormAlert>}
      <PasswordField
        label={t('current')}
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...register('currentPassword')}
      />
      <div className={styles.twoCols}>
        <PasswordField
          label={t('new')}
          autoComplete="new-password"
          hint={t('hint', { n: formatCount(PASSWORD_MIN) })}
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <PasswordField
          label={t('confirm')}
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
      </div>
      <Button type="submit" variant="ink" className={styles.submit} disabled={change.isPending}>
        {change.isPending ? t('changing') : t('change')}
      </Button>
    </form>
  );
}

function DeleteCard() {
  const { t } = useTranslation('account', { keyPrefix: 'security.delete' });
  const { t: tShared } = useTranslation('account', { keyPrefix: 'shared' });
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
      toast.success(t('done'));
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
        {t('title')}
      </h2>
      <p className={styles.dangerText}>{t('text')}</p>
      {remove.isError && <FormAlert>{errorMessage(remove.error)}</FormAlert>}
      <PasswordField
        label={t('password')}
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <Checkbox {...register('confirm')}>{t('confirm')}</Checkbox>
      {errors.confirm?.message && <p className={styles.error}>{errors.confirm.message}</p>}
      <Button type="submit" variant="red" className={styles.submit} disabled={remove.isPending}>
        {remove.isPending ? tShared('deleting') : t('submit')}
      </Button>
    </form>
  );
}

/** «الحساب والأمان» (API §7): profile, password, account deletion (KVKK). */
export default function AccountSecurityPage() {
  const { t } = useTranslation('account');
  const { customer } = useSession();
  if (!customer) return null;
  return (
    <>
      <AccountHeader title={t('security.title')} />
      <ProfileCard key={customer.id} customer={customer} />
      <PasswordCard />
      <DeleteCard />
    </>
  );
}