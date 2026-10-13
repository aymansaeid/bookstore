import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useSearchParams } from 'react-router';

import { safeReturnTo } from '@/app/navigation';
import { paths } from '@/app/paths';
import { AuthHeader, AuthTabs, SocialSignIn } from '@/features/auth/components/AuthParts';
import styles from '@/features/auth/components/auth.module.css';
import { ResendVerification } from '@/features/auth/components/ResendVerification';
import { type LoginValues, loginSchema, trimValue } from '@/features/auth/schemas';
import { login, useSession } from '@/features/auth/session';
import { isApiError } from '@/shared/api/ApiError';
import { errorMessage } from '@/shared/api/errorMessages';
import { Button } from '@/shared/ui/Button/Button';
import { FormAlert, PasswordField, TextField } from '@/shared/ui/form/Field';

export default function LoginPage() {
  const { status } = useSession();
  const [params] = useSearchParams();
  const rawReturnTo = params.get('returnTo');
  const [serverError, setServerError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  // Already signed in, or just signed in: login() updates the session and this redirects.
  if (status === 'authenticated') return <Navigate to={safeReturnTo(rawReturnTo)} replace />;

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setServerError(null);
    setUnverifiedEmail(null);
    try {
      await login(email, password);
    } catch (error) {
      if (isApiError(error) && error.code === 'Customer.EmailNotVerified') {
        setUnverifiedEmail(email);
      } else {
        setServerError(errorMessage(error));
      }
    }
  });

  return (
    <>
      <AuthHeader title="أهلاً بعودتك" subtitle="سجّل دخولك لتكمل مسار قراءتك وتتابع طلباتك." />
      <AuthTabs active="login" returnTo={rawReturnTo} />

      <form
        noValidate
        onSubmit={(event) => {
          void onSubmit(event);
        }}
      >
        {serverError && <FormAlert>{serverError}</FormAlert>}
        {unverifiedEmail && (
          <FormAlert>
            فعّل حسابك من الرابط المرسل إلى بريدك أولاً.
            <ResendVerification email={unverifiedEmail} />
          </FormAlert>
        )}

        <TextField
          label="البريد الإلكتروني"
          type="email"
          dir="ltr"
          inputMode="email"
          autoComplete="email"
          placeholder="name@example.com"
          error={errors.email?.message}
          {...register('email', { setValueAs: trimValue })}
        />
        <PasswordField
          label="كلمة المرور"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <div className={styles.row}>
          <Link to={paths.forgotPassword} className={styles.textLink}>
            نسيت كلمة المرور؟
          </Link>
        </div>

        <Button
          type="submit"
          variant="ink"
          className={styles.submit}
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? 'جارٍ تسجيل الدخول…' : 'تسجيل الدخول'}
        </Button>
      </form>

      <SocialSignIn />
    </>
  );
}
