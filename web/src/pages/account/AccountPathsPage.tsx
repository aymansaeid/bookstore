import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { AccountHeader } from '@/features/account/components/AccountHeader';
import shared from '@/features/account/components/account.module.css';
import { useCustomerId } from '@/features/account/queries';
import { BookCover } from '@/features/catalog/components/BookCover';
import { type MyReadingPath, myPathsApi } from '@/features/paths/api';
import { levelLabel } from '@/shared/api/enums';
import { errorMessage } from '@/shared/api/errorMessages';
import { formatCount, formatPercent } from '@/shared/lib/format';
import { Button, ButtonLink } from '@/shared/ui/Button/Button';
import { Icon } from '@/shared/ui/Icon/Icon';
import { toast } from '@/shared/ui/toast/toastStore';

import styles from './AccountPathsPage.module.css';

function PathCard({ item }: { item: MyReadingPath }) {
  const { t } = useTranslation('account', { keyPrefix: 'paths' });
  const queryClient = useQueryClient();
  const { summary, progress, nextStage } = item;
  const leave = useMutation({
    mutationFn: () => myPathsApi.leave(summary.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me', 'paths'] });
      toast.success(t('left'));
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });

  return (
    <li className={styles.card}>
      <div className={styles.head}>
        <Link to={paths.readingPath(summary.slug)} className={styles.title}>
          {summary.title}
        </Link>
        <span className={styles.level}>{levelLabel(summary.level)}</span>
      </div>
      <div
        className={styles.bar}
        role="progressbar"
        aria-label={t('progress', { title: summary.title })}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
      >
        <span style={{ inlineSize: `${String(progress.percent)}%` }} />
      </div>
      <p className={styles.muted}>
        {t('done', {
          done: formatCount(progress.completedStages),
          total: formatCount(progress.totalStages),
          percent: formatPercent(progress.percent),
        })}
      </p>

      {nextStage ? (
        <div className={styles.next}>
          <Link to={paths.book(nextStage.book.slug)} className={styles.nextCover}>
            <BookCover
              title={nextStage.book.title}
              src={nextStage.book.coverImageUrl}
              sizes="64px"
            />
          </Link>
          <div>
            <p className={styles.nextLabel}>
              {t('next', { n: formatCount(nextStage.stageNumber) })}
            </p>
            <Link to={paths.book(nextStage.book.slug)} className={styles.nextTitle}>
              {nextStage.book.title}
            </Link>
            <p className={styles.reason}>{nextStage.reason}</p>
          </div>
        </div>
      ) : (
        <p className={styles.done}>
          <Icon name="check" size={16} /> {t('finished')}
        </p>
      )}

      <div className={styles.actions}>
        <ButtonLink to={paths.readingPath(summary.slug)} variant="ink" size="sm">
          {t('view')}
        </ButtonLink>
        <Button
          variant="ghost"
          size="sm"
          disabled={leave.isPending}
          onClick={() => {
            leave.mutate();
          }}
        >
          {t('leave')}
        </Button>
      </div>
    </li>
  );
}

/** «مساراتي» (API §7d): enrolled reading paths with progress and the next book. */
export default function AccountPathsPage() {
  const { t } = useTranslation('account', { keyPrefix: 'paths' });
  const customerId = useCustomerId();
  const myPaths = useQuery({
    queryKey: ['me', 'paths', customerId ?? 0] as const,
    queryFn: () => myPathsApi.list(),
    enabled: customerId !== null,
  });

  return (
    <>
      <AccountHeader title={t('title')} description={t('lead')} />
      {myPaths.isError ? (
        <div className={shared.empty} role="alert">
          <p>{errorMessage(myPaths.error)}</p>
        </div>
      ) : !myPaths.data ? (
        <div className={shared.skeleton} aria-busy="true" aria-label={t('loading')} />
      ) : myPaths.data.length === 0 ? (
        <div className={shared.empty}>
          <Icon name="route" size={28} />
          <p>{t('none')}</p>
          <ButtonLink to={paths.readingPaths} variant="ink" size="sm">
            {t('browse')}
          </ButtonLink>
        </div>
      ) : (
        <ul className={styles.list}>
          {myPaths.data.map((item) => (
            <PathCard key={item.summary.id} item={item} />
          ))}
        </ul>
      )}
    </>
  );
}