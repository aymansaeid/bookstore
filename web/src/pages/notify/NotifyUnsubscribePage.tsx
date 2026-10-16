import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';

import { paths } from '@/app/paths';
import { AuthStatus } from '@/features/auth/components/AuthParts';
import styles from '@/features/auth/components/auth.module.css';
import { bookApi } from '@/features/book/api';
import { ButtonLink } from '@/shared/ui/Button/Button';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';

/** Always 204 (§8), so success is shown whenever the request completes. */
export default function NotifyUnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const unsubscribe = useQuery({
    queryKey: ['stock-notification', 'unsubscribe', token],
    queryFn: () => bookApi.unsubscribeStock(token).then(() => true),
    enabled: token !== '',
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return (
    <div className="wrap" style={{ maxInlineSize: 520, paddingBlock: 48 }}>
      <DocumentTitle title="إلغاء تنبيه التوفّر" />
      {unsubscribe.isError || token === '' ? (
        <AuthStatus title="تعذّر إلغاء التنبيه" tone="error">
          <p>تحقّق من الرابط في الرسالة وحاول مجدداً.</p>
        </AuthStatus>
      ) : unsubscribe.isSuccess ? (
        <AuthStatus title="تم إلغاء التنبيه" tone="success">
          <p>لن نراسلك بشأن هذا الكتاب بعد الآن.</p>
          <div className={styles.actions}>
            <ButtonLink to={paths.home} variant="ink">
              العودة إلى المتجر
            </ButtonLink>
          </div>
        </AuthStatus>
      ) : (
        <AuthStatus title="جارٍ الإلغاء…">
          <p>لحظة من فضلك.</p>
        </AuthStatus>
      )}
    </div>
  );
}
