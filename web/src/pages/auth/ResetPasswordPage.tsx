import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { paths } from '@/app/paths';
import { authApi } from '@/features/auth/api';
import { AuthHeader, AuthStatus } from '@/features/auth/components/AuthParts';
import styles from '@/features/auth/components/auth.module.css';
import {
  PASSWORD_MIN,
  type ResetPasswordValues,
  resetPasswordSchema,
} from '@/features/auth/schemas';
import { endSessionLocally } from '@/features/auth/session';
import { isApiError } from '@/shared/api/ApiError';
import { errorMessage } from '@/shared/api/errorMessages';
import { formatCount } from '@/shared/lib/format';
import { Button, ButtonLink } from '@/shared/ui/Button/Button';
import { FormAlert, PasswordField } from '@/shared/ui/form/Field';

/** Link from the reset email (valid 30 min, once). A reset signs out every device. */
export default function ResetPasswordPage() {
  const { t } = useTranslation('auth');
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [done, setDone] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(token === '');
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
    mode: 'onTouched',
  });

  if (done) {
    return (
      <>
        <AuthHeader title={t('reset.title')} />
        <AuthStatus title={t('reset.doneTitle')} tone="success">
          <p>{t('reset.doneText')}</p>
          <div className={styles.actions}>
            <ButtonLink to={paths.login} variant="ink">
              {t('login.submit')}
            </ButtonLink>
          </div>
        </AuthStatus>
      </>
    );
  }

  if (linkInvalid) {
    return (
      <>
        <AuthHeader title={t('reset.title')} />
        <AuthStatus title={t('reset.invalidTitle')} tone="error">
          <p>{t('reset.invalidText')}</p>
          <div className={styles.actions}>
            <ButtonLink to={paths.forgotPassword} variant="ink">
              {t('reset.newLink')}
            </ButtonLink>
          </div>
        </AuthStatus>
      </>
    );
  }

  const onSubmit = handleSubmit(async ({ newPassword }) => {
    setServerError(null);
    try {
      await authApi.resetPassword(token, newPassword);
      endSessionLocally();
      setDone(true);
    } catch (error) {
      if (isApiError(error) && error.code === 'Customer.InvalidToken') setLinkInvalid(true);
      else setServerError(errorMessage(error));
    }
  });

  return (
    <>
      <AuthHeader title={t('reset.title')} subtitle={t('reset.subtitle')} />
      <form
        noValidate
        onSubmit={(event) => {
          void onSubmit(event);
        }}
      >
        {serverError && <FormAlert>{serverError}</FormAlert>}
        <PasswordField
          label={t('fields.newPassword')}
          autoComplete="new-password"
          hint={t('fields.passwordHint', { n: formatCount(PASSWORD_MIN) })}
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <PasswordField
          label={t('fields.confirmPassword')}
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button
          type="submit"
          variant="ink"
          className={styles.submit}
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? t('reset.saving') : t('reset.save')}
        </Button>
      </form>
    </>
  );
}