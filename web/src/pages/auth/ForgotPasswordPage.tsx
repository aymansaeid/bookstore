import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';

import { paths } from '@/app/paths';
import { authApi } from '@/features/auth/api';
import { AuthHeader, AuthStatus } from '@/features/auth/components/AuthParts';
import styles from '@/features/auth/components/auth.module.css';
import { type EmailOnlyValues, emailOnlySchema, trimValue } from '@/features/auth/schemas';
import { errorMessage } from '@/shared/api/errorMessages';
import { formatCount } from '@/shared/lib/format';
import { useCooldown } from '@/shared/lib/useCooldown';
import { Button, ButtonLink } from '@/shared/ui/Button/Button';
import { FormAlert, TextField } from '@/shared/ui/form/Field';

/** POST /forgot-password: always 204, so the reply never reveals whether the email exists. */
export default function ForgotPasswordPage() {
  const { t } = useTranslation('auth');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const cooldown = useCooldown(60);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailOnlyValues>({
    resolver: zodResolver(emailOnlySchema),
    defaultValues: { email: '' },
  });

  const send = async (email: string) => {
    setServerError(null);
    try {
      await authApi.forgotPassword(email);
      setSentTo(email);
      cooldown.start();
    } catch (error) {
      setServerError(errorMessage(error));
    }
  };

  if (sentTo) {
    return (
      <>
        <AuthHeader title={t('forgot.title')} />
        <AuthStatus title={t('forgot.checkTitle')}>
          <p>
            <Trans
              t={t}
              i18nKey="forgot.sent"
              values={{ email: sentTo }}
              components={{ b: <b dir="ltr" /> }}
            />
          </p>
          {serverError && <FormAlert>{serverError}</FormAlert>}
          <div className={styles.actions}>
            <Button
              variant="ghost"
              disabled={cooldown.remaining > 0}
              onClick={() => {
                void send(sentTo);
              }}
            >
              {cooldown.remaining > 0
                ? t('forgot.wait', { n: formatCount(cooldown.remaining) })
                : t('forgot.resend')}
            </Button>
            <ButtonLink to={paths.login} variant="ink">
              {t('register.backToLogin')}
            </ButtonLink>
          </div>
        </AuthStatus>
      </>
    );
  }

  return (
    <>
      <AuthHeader title={t('forgot.formTitle')} subtitle={t('forgot.subtitle')} />
      <form
        noValidate
        onSubmit={(event) => {
          void handleSubmit((values) => send(values.email))(event);
        }}
      >
        {serverError && <FormAlert>{serverError}</FormAlert>}
        <TextField
          label={t('fields.email')}
          type="email"
          dir="ltr"
          inputMode="email"
          autoComplete="email"
          placeholder="name@example.com"
          error={errors.email?.message}
          {...register('email', { setValueAs: trimValue })}
        />
        <Button
          type="submit"
          variant="ink"
          className={styles.submit}
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? t('forgot.sending') : t('forgot.send')}
        </Button>
      </form>
      <div className={styles.row}>
        <ButtonLink to={paths.login} variant="ghost" size="sm">
          {t('register.backToLogin')}
        </ButtonLink>
      </div>
    </>
  );
}