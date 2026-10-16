import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';

import { searchUrl } from '@/app/navigation';
import { paths } from '@/app/paths';
import { AuthStatus } from '@/features/auth/components/AuthParts';
import styles from '@/features/auth/components/auth.module.css';
import { bookApi } from '@/features/book/api';
import { cx } from '@/shared/lib/cx';
import { ButtonLink } from '@/shared/ui/Button/Button';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';

/** Link from the confirmation email (§8). Single-use: one request even under StrictMode. */
export default function NotifyConfirmPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const confirm = useQuery({
    queryKey: ['stock-notification', 'confirm', token],
    queryFn: () => bookApi.confirmStock(token),
    enabled: token !== '',
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return (
    <div className={cx('wrap')} style={{ maxInlineSize: 520, paddingBlock: 48 }}>
      <DocumentTitle title="تأكيد تنبيه التوفّر" />
      {token !== '' && confirm.isPending ? (
        <AuthStatus title="جارٍ التأكيد…">
          <p>لحظة من فضلك.</p>
        </AuthStatus>
      ) : confirm.isSuccess ? (
        <AuthStatus title="تم تفعيل التنبيه" tone="success">
          <p>سنراسلك فور عودة «{confirm.data.bookTitle}» إلى المخزون.</p>
          <div className={styles.actions}>
            <ButtonLink to={searchUrl(confirm.data.bookTitle)} variant="ink">
              عرض الكتاب
            </ButtonLink>
          </div>
        </AuthStatus>
      ) : (
        <AuthStatus title="الرابط غير صالح أو استُخدم من قبل" tone="error">
          <p>يمكنك طلب تنبيه جديد من صفحة الكتاب.</p>
          <div className={styles.actions}>
            <ButtonLink to={paths.home} variant="ink">
              العودة إلى المتجر
            </ButtonLink>
          </div>
        </AuthStatus>
      )}
    </div>
  );
}
