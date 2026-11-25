import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { paths } from '@/app/paths';
import { AuthStatus } from '@/features/auth/components/AuthParts';
import styles from '@/features/auth/components/auth.module.css';
import { bookApi } from '@/features/book/api';
import { ButtonLink } from '@/shared/ui/Button/Button';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';

/** Always 204 (§8), so success is shown whenever the request completes. */
export default function NotifyUnsubscribePage() {
  const { t } = useTranslation('auth', { keyPrefix: 'notify' });
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
      <DocumentTitle title={t('unsubscribeTitle')} />
      {unsubscribe.isError || token === '' ? (
        <AuthStatus title={t('unsubscribeFailed')} tone="error">
          <p>{t('unsubscribeFailedText')}</p>
        </AuthStatus>
      ) : unsubscribe.isSuccess ? (
        <AuthStatus title={t('unsubscribed')} tone="success">
          <p>{t('unsubscribedText')}</p>
          <div className={styles.actions}>
            <ButtonLink to={paths.home} variant="ink">
              {t('backToStore')}
            </ButtonLink>
          </div>
        </AuthStatus>
      ) : (
        <AuthStatus title={t('unsubscribing')}>
          <p>{t('wait')}</p>
        </AuthStatus>
      )}
    </div>
  );
}