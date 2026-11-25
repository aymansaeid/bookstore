import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { AccountHeader } from '@/features/account/components/AccountHeader';
import shared from '@/features/account/components/account.module.css';
import { useCustomerId } from '@/features/account/queries';
import { followKeys, followsApi, useToggleFollow } from '@/features/muhaqqiq/follows';
import { errorMessage } from '@/shared/api/errorMessages';
import { formatDate, worksPhrase } from '@/shared/lib/format';
import { Button, ButtonLink } from '@/shared/ui/Button/Button';
import { Icon } from '@/shared/ui/Icon/Icon';

import styles from './AccountCollections.module.css';

/** «تنبيهات المحققين» (API §7c): muhaqqiqs you follow; each new edition notifies you. */
export default function AccountFollowingPage() {
  const { t } = useTranslation('account');
  const customerId = useCustomerId();
  const follows = useQuery({
    queryKey: followKeys.list(customerId ?? 0),
    queryFn: () => followsApi.list(),
    enabled: customerId !== null,
  });
  const toggle = useToggleFollow();

  return (
    <>
      <AccountHeader title={t('following.title')} description={t('following.lead')} />
      {follows.isError ? (
        <div className={shared.empty} role="alert">
          <p>{errorMessage(follows.error)}</p>
        </div>
      ) : !follows.data ? (
        <div className={shared.skeleton} aria-busy="true" aria-label={t('shared.loading')} />
      ) : follows.data.length === 0 ? (
        <div className={shared.empty}>
          <Icon name="bell" size={28} />
          <p>{t('following.none')}</p>
          <ButtonLink to={paths.search} variant="ink" size="sm">
            {t('shared.browse')}
          </ButtonLink>
        </div>
      ) : (
        <ul className={styles.grid}>
          {follows.data.map(({ muhaqqiq, followedAtUtc }) => (
            <li key={muhaqqiq.id} className={styles.item}>
              <span className={styles.avatar} aria-hidden="true">
                {muhaqqiq.name.trim().charAt(0)}
              </span>
              <div className={styles.body}>
                <Link to={paths.muhaqqiq(muhaqqiq.slug)} className={styles.title}>
                  {muhaqqiq.name}
                </Link>
                <span className={styles.sub}>{worksPhrase(muhaqqiq.worksCount)}</span>
                {muhaqqiq.specialties.length > 0 && (
                  <ul className={styles.chips}>
                    {muhaqqiq.specialties.map((specialty) => (
                      <li key={specialty}>{specialty}</li>
                    ))}
                  </ul>
                )}
                <span className={styles.sub}>
                  {t('following.since', { date: formatDate(followedAtUtc) })}
                </span>
                <div className={styles.actions}>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={toggle.isPending}
                    onClick={() => {
                      toggle.mutate({ id: muhaqqiq.id, following: true });
                    }}
                  >
                    {t('following.unfollow')}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}