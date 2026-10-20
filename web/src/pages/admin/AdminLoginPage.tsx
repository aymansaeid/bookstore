import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useSearchParams } from 'react-router';

import { paths } from '@/app/paths';
import { adminLogin, initAdminSession, useAdminSession } from '@/features/admin/session';
import { type LoginValues, loginSchema, trimValue } from '@/features/auth/schemas';
import { errorMessage } from '@/shared/api/errorMessages';
import { Button } from '@/shared/ui/Button/Button';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';
import { FormAlert, PasswordField, TextField } from '@/shared/ui/form/Field';
import { Logo } from '@/shared/ui/Logo/Logo';

import styles from './AdminLoginPage.module.css';

/** Only admin pages are valid return targets. */
function adminReturnTo(value: string | null): string {
  if (value === paths.admin.root || value?.startsWith(`${paths.admin.root}/`)) {
    if (!value.startsWith(paths.admin.login) && !value.includes('//')) return value;
  }
  return paths.admin.root;
}

/** Admin sign-in (API §3, §10). 60-minute token, kept in memory only. */
export default function AdminLoginPage() {
  const session = useAdminSession();
  const [params] = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    initAdminSession();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  if (session.status === 'signedIn') {
    return <Navigate to={adminReturnTo(params.get('returnTo'))} replace />;
  }

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setServerError(null);
    try {
      await adminLogin(email, password);
    } catch (error) {
      setServerError(errorMessage(error));
    }
  });

  return (
    <div className={styles.page}>
      <DocumentTitle title="دخول الإدارة" />
      <div className={styles.card}>
        <Logo className={styles.logo} priority />
        <h1 className={styles.title}>لوحة الإدارة</h1>
        <p className={styles.subtitle}>سجّل الدخول بحساب المدير.</p>

        <form
          noValidate
          onSubmit={(event) => {
            void onSubmit(event);
          }}
        >
          {session.ended === 'expired' && !serverError && (
            <FormAlert>انتهت جلستك، سجّل الدخول من جديد.</FormAlert>
          )}
          {serverError && <FormAlert>{serverError}</FormAlert>}

          <TextField
            label="البريد الإلكتروني"
            type="email"
            dir="ltr"
            inputMode="email"
            autoComplete="username"
            error={errors.email?.message}
            {...register('email', { setValueAs: trimValue })}
          />
          <PasswordField
            label="كلمة المرور"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" variant="ink" className={styles.submit} disabled={isSubmitting}>
            {isSubmitting ? 'جارٍ الدخول…' : 'دخول'}
          </Button>
        </form>

        <p className={styles.note}>
          الجلسة ساعة واحدة وتبقى في الذاكرة فقط: إذا أُغلقت كل نوافذ الإدارة أو حُدّثت، تحتاج إلى
          الدخول من جديد.
        </p>
        <Link to={paths.home} className={styles.back}>
          العودة إلى المتجر
        </Link>
      </div>
    </div>
  );
}
