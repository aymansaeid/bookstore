import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router';

import { paths } from '@/app/paths';
import { mockPaymentsApi } from '@/features/checkout/api';
import { ApiError } from '@/shared/api/ApiError';
import { errorMessage } from '@/shared/api/errorMessages';
import { formatCount, formatMoney } from '@/shared/lib/format';
import { useNow } from '@/shared/lib/useNow';
import { Button, ButtonLink } from '@/shared/ui/Button/Button';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';
import { FormAlert } from '@/shared/ui/form/Field';
import { Logo } from '@/shared/ui/Logo/Logo';

import styles from './MockCheckoutPage.module.css';

const withOrder = (path: string, orderNumber: string) =>
  `${path}?${new URLSearchParams({ order: orderNumber }).toString()}`;

function countdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${formatCount(minutes)}:${seconds.toLocaleString('ar-EG', { minimumIntegerDigits: 2 })}`;
}

/**
 * Development stand-in for the payment provider's hosted page (API §5). With
 * the real provider, checkoutUrl points at the provider and this page is never
 * reached.
 */
export default function MockCheckoutPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = params.get('session') ?? '';
  const orderParam = params.get('order') ?? '';

  const session = useQuery({
    queryKey: ['mock-payment', sessionId] as const,
    queryFn: () => mockPaymentsApi.session(sessionId),
    enabled: sessionId !== '',
    retry: false,
    staleTime: Infinity,
  });
  const now = useNow(1000, session.data?.status === 'Open');

  const pay = useMutation({
    mutationFn: () => mockPaymentsApi.pay(sessionId),
    onSuccess: () => {
      void navigate(withOrder(paths.checkoutSuccess, session.data?.orderNumber ?? orderParam));
    },
  });

  const orderNumber = session.data?.orderNumber ?? orderParam;
  const remaining =
    session.data && now !== null ? Date.parse(session.data.expiresAtUtc) - now : null;
  const expired =
    session.data?.status === 'Expired' ||
    (remaining !== null && remaining <= 0) ||
    (pay.error instanceof ApiError && pay.error.status === 409);

  return (
    <div className={styles.page}>
      <DocumentTitle title="صفحة الدفع التجريبية" />
      <div className={styles.card}>
        <Logo className={styles.logo} alt="كتاب أفندي" />
        <p className={styles.badge}>بوابة دفع تجريبية · بيئة التطوير فقط</p>

        {sessionId === '' ? (
          <FormAlert>رابط الدفع ناقص.</FormAlert>
        ) : session.isPending ? (
          <p className={styles.muted} aria-busy="true">
            جارٍ تحميل جلسة الدفع…
          </p>
        ) : session.isError ? (
          <FormAlert>
            {session.error instanceof ApiError && session.error.status === 404
              ? 'جلسة الدفع غير موجودة. ربما أُعيد تشغيل الخادم.'
              : errorMessage(session.error)}
          </FormAlert>
        ) : session.data.status === 'Completed' ? (
          <>
            <h1 className={styles.title}>تم الدفع لهذه الجلسة</h1>
            <ButtonLink to={withOrder(paths.checkoutSuccess, orderNumber)} variant="ink">
              عرض الطلب
            </ButtonLink>
          </>
        ) : expired ? (
          <>
            <h1 className={styles.title}>انتهت الجلسة</h1>
            <p className={styles.muted}>
              انتهت مهلة الدفع لهذا الطلب. ارجع إلى السلة وابدأ من جديد.
            </p>
            <ButtonLink to={paths.cart} variant="ink">
              العودة إلى السلة
            </ButtonLink>
          </>
        ) : (
          <>
            <h1 className={styles.title}>إتمام الدفع</h1>
            <dl className={styles.facts}>
              <div>
                <dt>رقم الطلب</dt>
                <dd dir="ltr">{orderNumber}</dd>
              </div>
              <div>
                <dt>المبلغ</dt>
                <dd className={styles.amount}>
                  {formatMoney(session.data.total, session.data.currency)}
                </dd>
              </div>
              <div>
                <dt>تنتهي الجلسة بعد</dt>
                <dd className={styles.timer} aria-live="off">
                  {remaining === null ? '—' : countdown(remaining)}
                </dd>
              </div>
            </dl>
            {pay.isError && <FormAlert>{errorMessage(pay.error)}</FormAlert>}
            <div className={styles.actions}>
              <Button
                variant="red"
                disabled={pay.isPending || pay.isSuccess}
                onClick={() => {
                  pay.mutate();
                }}
              >
                {pay.isPending || pay.isSuccess ? 'جارٍ الدفع…' : 'ادفع (محاكاة)'}
              </Button>
              <ButtonLink to={withOrder(paths.checkoutCancel, orderNumber)} variant="ghost">
                إلغاء والعودة إلى المتجر
              </ButtonLink>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
