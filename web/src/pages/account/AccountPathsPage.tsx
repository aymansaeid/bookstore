import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { AccountHeader } from '@/features/account/components/AccountHeader';
import shared from '@/features/account/components/account.module.css';
import { useCustomerId } from '@/features/account/queries';
import { BookCover } from '@/features/catalog/components/BookCover';
import { type MyReadingPath, myPathsApi } from '@/features/paths/api';
import { levelLabel } from '@/shared/api/enums';
import { errorMessage } from '@/shared/api/errorMessages';
import { formatCount } from '@/shared/lib/format';
import { Button, ButtonLink } from '@/shared/ui/Button/Button';
import { Icon } from '@/shared/ui/Icon/Icon';
import { toast } from '@/shared/ui/toast/toastStore';

import styles from './AccountPathsPage.module.css';

function PathCard({ item }: { item: MyReadingPath }) {
  const queryClient = useQueryClient();
  const { summary, progress, nextStage } = item;
  const leave = useMutation({
    mutationFn: () => myPathsApi.leave(summary.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me', 'paths'] });
      toast.success('تركت المسار. يمكنك العودة إليه متى شئت.');
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
        aria-label={`تقدّمك في «${summary.title}»`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
      >
        <span style={{ inlineSize: `${String(progress.percent)}%` }} />
      </div>
      <p className={styles.muted}>
        أنجزت {formatCount(progress.completedStages)} من {formatCount(progress.totalStages)} مراحل ·{' '}
        {formatCount(progress.percent)}٪
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
              التالي في مسارك · المرحلة {formatCount(nextStage.stageNumber)}
            </p>
            <Link to={paths.book(nextStage.book.slug)} className={styles.nextTitle}>
              {nextStage.book.title}
            </Link>
            <p className={styles.reason}>{nextStage.reason}</p>
          </div>
        </div>
      ) : (
        <p className={styles.done}>
          <Icon name="check" size={16} /> أتممت هذا المسار. بارك الله في علمك.
        </p>
      )}

      <div className={styles.actions}>
        <ButtonLink to={paths.readingPath(summary.slug)} variant="ink" size="sm">
          عرض المسار
        </ButtonLink>
        <Button
          variant="ghost"
          size="sm"
          disabled={leave.isPending}
          onClick={() => {
            leave.mutate();
          }}
        >
          ترك المسار
        </Button>
      </div>
    </li>
  );
}

/** «مساراتي» (API §7d): enrolled reading paths with progress and the next book. */
export default function AccountPathsPage() {
  const customerId = useCustomerId();
  const myPaths = useQuery({
    queryKey: ['me', 'paths', customerId ?? 0] as const,
    queryFn: () => myPathsApi.list(),
    enabled: customerId !== null,
  });

  return (
    <>
      <AccountHeader
        title="مساراتي"
        description="تقدّمك يُحسب من مكتبتك: كل كتاب تنهيه يُتمّ مرحلته."
      />
      {myPaths.isError ? (
        <div className={shared.empty} role="alert">
          <p>{errorMessage(myPaths.error)}</p>
        </div>
      ) : !myPaths.data ? (
        <div className={shared.skeleton} aria-busy="true" aria-label="جارٍ تحميل مساراتك" />
      ) : myPaths.data.length === 0 ? (
        <div className={shared.empty}>
          <Icon name="route" size={28} />
          <p>لم تبدأ أي مسار قراءة بعد.</p>
          <ButtonLink to={paths.readingPaths} variant="ink" size="sm">
            تصفّح مسارات القراءة
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
