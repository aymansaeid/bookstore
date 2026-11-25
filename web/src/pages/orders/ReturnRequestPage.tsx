import { useQuery } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { Trans, useTranslation } from 'react-i18next';

import { useSession } from '@/features/auth/session';
import { OrderLookupForm } from '@/features/orders/components/OrderLookupForm';
import { trackOrderUrl } from '@/features/orders/links';
import type { OrderLookup } from '@/features/orders/types';
import { useOrderLookup } from '@/features/orders/useOrderLookup';
import { returnKeys, returnsApi } from '@/features/returns/api';
import { ReturnForm } from '@/features/returns/components/ReturnForm';
import { ReturnStatusCard } from '@/features/returns/components/ReturnStatusCard';
import type { ReturnEligibility } from '@/features/returns/types';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { ButtonLink } from '@/shared/ui/Button/Button';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';
import { Icon } from '@/shared/ui/Icon/Icon';

import styles from './OrderPages.module.css';

const EMPTY: OrderLookup = { orderNumber: '', email: '' };

/** Why a return can't be requested (API §9 ReturnEligibilityDto.reason). */
function notEligibleText(
  t: TFunction<'orders', 'returns'>,
  reason: ReturnEligibility['reason'],
): string {
  switch (reason) {
    case 'WindowClosed':
      return t('windowClosed');
    case 'AlreadyRequested':
      return t('alreadyRequested');
    default:
      return t('notEligible');
  }
}

/** /returns: the 14-day withdrawal right, for guests and customers alike (API §9). */
export default function ReturnRequestPage() {
  const { t } = useTranslation('orders', { keyPrefix: 'returns' });
  const { customer } = useSession();
  const { lookup, orderNumber, email, setLookup, clear } = useOrderLookup();
  const key = lookup ?? EMPTY;

  const eligibility = useQuery({
    queryKey: returnKeys.eligibility(key),
    queryFn: () => returnsApi.eligibility(key),
    enabled: lookup !== null,
    staleTime: 30_000,
  });
  const latest = useQuery({
    queryKey: returnKeys.status(key),
    queryFn: () => returnsApi.status(key),
    enabled: lookup !== null,
    staleTime: 30_000,
  });

  const failed = eligibility.error ?? latest.error;
  const showForm = !lookup || failed !== null;
  const loading = eligibility.isPending || latest.isPending;

  const refetch = () => {
    void eligibility.refetch();
    void latest.refetch();
  };

  return (
    <div className={cx('wrap', styles.page)}>
      <DocumentTitle title={t('tabTitle')} />
      <header className={styles.header}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.lead}>{t('lead')}</p>
      </header>

      {showForm ? (
        <OrderLookupForm
          key={`${orderNumber}|${email}`}
          defaults={{ orderNumber, email: email || (customer?.email ?? '') }}
          submitLabel={t('continue')}
          busy={eligibility.isFetching || latest.isFetching}
          error={failed ? errorMessage(failed) : null}
          onLookup={(next) => {
            if (lookup?.orderNumber === next.orderNumber && lookup.email === next.email) {
              refetch();
            } else {
              setLookup(next);
            }
          }}
        />
      ) : loading ? (
        <div className={styles.skeleton} aria-busy="true" aria-label={t('checking')} />
      ) : (
        <div className={styles.result}>
          <p className={styles.orderLine}>
            <Trans
              t={t}
              i18nKey="order"
              values={{ number: lookup.orderNumber }}
              components={{ b: <b dir="ltr" /> }}
            />
            <ButtonLink
              to={trackOrderUrl(lookup.orderNumber)}
              state={{ email: lookup.email }}
              variant="ghost"
              size="sm"
            >
              {t('viewOrder')}
            </ButtonLink>
          </p>

          {latest.data && <ReturnStatusCard lookup={lookup} value={latest.data} />}

          {eligibility.data?.canRequest ? (
            <ReturnForm
              key={latest.data?.requestedAtUtc ?? 'first'}
              lookup={lookup}
              eligibility={eligibility.data}
            />
          ) : (
            eligibility.data &&
            !(latest.data && eligibility.data.reason === 'AlreadyRequested') && (
              <p className={styles.note}>{notEligibleText(t, eligibility.data.reason)}</p>
            )
          )}

          <button type="button" className={styles.another} onClick={clear}>
            <Icon name="search" size={16} /> {t('another')}
          </button>
        </div>
      )}
    </div>
  );
}