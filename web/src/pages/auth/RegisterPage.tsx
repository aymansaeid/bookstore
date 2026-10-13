import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, Navigate, useSearchParams } from 'react-router';

import { legalSlugs } from '@/app/legal';
import { safeReturnTo } from '@/app/navigation';
import { paths } from '@/app/paths';
import { authApi } from '@/features/auth/api';
import {
  AuthHeader,
  AuthStatus,
  AuthTabs,
  SocialSignIn,
} from '@/features/auth/components/AuthParts';
import styles from '@/features/auth/components/auth.module.css';
import { ResendVerification } from '@/features/auth/components/ResendVerification';
import {
  PASSWORD_MIN,
  type RegisterValues,
  registerSchema,
  trimValue,
} from '@/features/auth/schemas';
import { useSession } from '@/features/auth/session';
import { useCategories } from '@/features/catalog/queries';
import { levelLabel, type ReaderLevel } from '@/shared/api/enums';
import { errorMessage } from '@/shared/api/errorMessages';
import { serverFieldErrors } from '@/shared/api/formErrors';
import { formatCount } from '@/shared/lib/format';
import { Button, ButtonLink } from '@/shared/ui/Button/Button';
import { Checkbox, FormAlert, PasswordField, TextField } from '@/shared/ui/form/Field';

const LEVELS: ReaderLevel[] = ['Beginner', 'Intermediate', 'Specialist'];
const SERVER_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'password'] as const;

export default function RegisterPage() {
  const { status } = useSession();
  const [params] = useSearchParams();
  const rawReturnTo = params.get('returnTo');
  const categories = useCategories();
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ email: string; at: number } | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      readingLevel: null,
      interestCategoryIds: [],
      acceptsMarketingEmails: false,
    },
    mode: 'onTouched',
  });

  if (status === 'authenticated') return <Navigate to={safeReturnTo(rawReturnTo)} replace />;

  if (sent) {
    return (
      <>
        <AuthHeader title="تحقّق من بريدك" />
        <AuthStatus title="خطوة أخيرة">
          <p>
            أرسلنا رسالة إلى <b dir="ltr">{sent.email}</b>. افتح الرابط فيها لتفعيل حسابك، وهو صالح
            لمدة ٢٤ ساعة.
          </p>
          <ResendVerification email={sent.email} sentAt={sent.at} />
          <div className={styles.actions}>
            <ButtonLink to={paths.login} variant="ink">
              العودة إلى تسجيل الدخول
            </ButtonLink>
          </div>
        </AuthStatus>
      </>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await authApi.register({
        ...values,
        phone: values.phone === '' ? null : values.phone,
      });
      setSent({ email: values.email, at: Date.now() });
    } catch (error) {
      const fieldErrors = serverFieldErrors(error);
      let mapped = false;
      for (const [path, message] of Object.entries(fieldErrors)) {
        const field = SERVER_FIELDS.find((name) => name === path);
        if (field) {
          setError(field, { message });
          mapped = true;
        }
      }
      if (!mapped) setServerError(errorMessage(error));
    }
  });

  const topCategories = categories.data ?? [];

  return (
    <>
      <AuthHeader
        title="حساب جديد"
        subtitle="أنشئ حسابك ليتذكّر أفندي ما تحب، وتتابع طلباتك ومكتبتك في مكان واحد."
      />
      <AuthTabs active="register" returnTo={rawReturnTo} />

      <form
        noValidate
        onSubmit={(event) => {
          void onSubmit(event);
        }}
      >
        {serverError && <FormAlert>{serverError}</FormAlert>}

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
          label="البريد الإلكتروني"
          type="email"
          dir="ltr"
          inputMode="email"
          autoComplete="email"
          placeholder="name@example.com"
          error={errors.email?.message}
          {...register('email', { setValueAs: trimValue })}
        />
        <TextField
          label="رقم الجوال (اختياري)"
          type="tel"
          dir="ltr"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+90 5xx xxx xx xx"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <PasswordField
          label="كلمة المرور"
          autoComplete="new-password"
          hint={`${formatCount(PASSWORD_MIN)} حرفاً على الأقل`}
          error={errors.password?.message}
          {...register('password')}
        />

        <fieldset className={styles.group}>
          <legend className={styles.groupLabel}>
            مستواك في القراءة <span className={styles.groupHint}>(اختياري)</span>
          </legend>
          <div className={styles.pills}>
            {LEVELS.map((level) => (
              <label key={level} className={styles.pill}>
                <input type="radio" value={level} {...register('readingLevel')} />
                {levelLabel(level)}
              </label>
            ))}
          </div>
        </fieldset>

        {topCategories.length > 0 && (
          <fieldset className={styles.group}>
            <legend className={styles.groupLabel}>
              اهتماماتك{' '}
              <span className={styles.groupHint}>(اختياري، يساعد أفندي على اقتراحاتك)</span>
            </legend>
            <Controller
              control={control}
              name="interestCategoryIds"
              render={({ field }) => (
                <div className={styles.pills}>
                  {topCategories.map((category) => {
                    const checked = field.value.includes(category.id);
                    return (
                      <label key={category.id} className={styles.pill}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onBlur={field.onBlur}
                          onChange={() => {
                            field.onChange(
                              checked
                                ? field.value.filter((id) => id !== category.id)
                                : [...field.value, category.id],
                            );
                          }}
                        />
                        {category.name}
                      </label>
                    );
                  })}
                </div>
              )}
            />
            {errors.interestCategoryIds?.message && (
              <p className={styles.groupError}>{errors.interestCategoryIds.message}</p>
            )}
          </fieldset>
        )}

        <Checkbox {...register('acceptsMarketingEmails')}>
          أرسلوا لي الإصدارات الجديدة والعروض بالبريد الإلكتروني
        </Checkbox>

        <p className={styles.legal}>
          بإنشاء حسابك فإنك توافق على <Link to={paths.legal(legalSlugs.terms)}>شروط الاستخدام</Link>{' '}
          و<Link to={paths.legal(legalSlugs.privacy)}>سياسة الخصوصية</Link>.
        </p>

        <Button
          type="submit"
          variant="ink"
          className={styles.submit}
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? 'جارٍ إنشاء الحساب…' : 'إنشاء الحساب'}
        </Button>
      </form>

      <SocialSignIn />
    </>
  );
}
