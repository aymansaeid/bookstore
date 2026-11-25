import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('auth', { keyPrefix: 'notify' });
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
      <DocumentTitle title={t('confirmTitle')} />
      {token !== '' && confirm.isPending ? (
        <AuthStatus title={t('confirming')}>
          <p>{t('wait')}</p>
        </AuthStatus>
      ) : confirm.isSuccess ? (
        <AuthStatus title={t('confirmed')} tone="success">
          <p>{t('confirmedText', { title: confirm.data.bookTitle })}</p>
          <div className={styles.actions}>
            <ButtonLink to={searchUrl(confirm.data.bookTitle)} variant="ink">
              {t('viewBook')}
            </ButtonLink>
          </div>
        </AuthStatus>
      ) : (
        <AuthStatus title={t('invalidTitle')} tone="error">
          <p>{t('invalidText')}</p>
          <div className={styles.actions}>
            <ButtonLink to={paths.home} variant="ink">
              {t('backToStore')}
            </ButtonLink>
          </div>
        </AuthStatus>
      )}
    </div>
  );
}