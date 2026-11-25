import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { paths } from '@/app/paths';
import { authApi } from '@/features/auth/api';
import { AuthHeader, AuthStatus } from '@/features/auth/components/AuthParts';
import styles from '@/features/auth/components/auth.module.css';
import { ResendVerification } from '@/features/auth/components/ResendVerification';
import { type EmailOnlyValues, emailOnlySchema, trimValue } from '@/features/auth/schemas';
import { ButtonLink, Button } from '@/shared/ui/Button/Button';
import { TextField } from '@/shared/ui/form/Field';

/**
 * Link from the verification email. Tokens are single-use, so the POST runs
 * through a query keyed by the token: StrictMode's double render and any
 * remount share ONE request (API guide §11).
 */
export default function VerifyEmailPage() {
  const { t } = useTranslation('auth');
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const verify = useQuery({
    queryKey: ['auth', 'verify-email', token],
    queryFn: () => authApi.verifyEmail(token).then(() => true),
    enabled: token !== '',
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  if (token !== '' && verify.isPending) {
    return (
      <>
        <AuthHeader title={t('verify.title')} />
        <AuthStatus title={t('verify.verifying')}>
          <p>{t('verify.wait')}</p>
        </AuthStatus>
      </>
    );
  }

  if (verify.isSuccess) {
    return (
      <>
        <AuthHeader title={t('verify.title')} />
        <AuthStatus title={t('verify.doneTitle')} tone="success">
          <p>{t('verify.doneText')}</p>
          <div className={styles.actions}>
            <ButtonLink to={paths.login} variant="ink">
              {t('login.submit')}
            </ButtonLink>
          </div>
        </AuthStatus>
      </>
    );
  }

  return (
    <>
      <AuthHeader title={t('verify.title')} />
      <AuthStatus title={t('verify.invalidTitle')} tone="error">
        <p>{t('verify.invalidText')}</p>
        <ResendForm />
      </AuthStatus>
    </>
  );
}

function ResendForm() {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailOnlyValues>({
    resolver: zodResolver(emailOnlySchema),
    defaultValues: { email: '' },
  });

  if (email) return <ResendVerification email={email} />;

  return (
    <form
      noValidate
      className={styles.actions}
      onSubmit={(event) => {
        void handleSubmit((values) => {
          setEmail(values.email);
        })(event);
      }}
    >
      <TextField
        label={t('fields.email')}
        type="email"
        dir="ltr"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email', { setValueAs: trimValue })}
      />
      <Button type="submit" variant="ink">
        {t('verify.continue')}
      </Button>
    </form>
  );
}