import { Trans, useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { paths } from '@/app/paths';
import { useSession } from '@/features/auth/session';
import { formatCount, formatDate, formatPercent } from '@/shared/lib/format';
import { Button, ButtonLink } from '@/shared/ui/Button/Button';
import { Icon } from '@/shared/ui/Icon/Icon';

import type { PathStage, ReadingPathDetail } from '../api';
import { useEnrollment } from '../queries';

import styles from './PathPanels.module.css';

/** «ابدأ المسار» and your progress (API §7d). Free; nothing is bought here. */
export function EnrollCard({ path }: { path: ReadingPathDetail }) {
  const { t } = useTranslation('paths', { keyPrefix: 'enroll' });
  const { status } = useSession();
  const location = useLocation();
  const { start, leave } = useEnrollment(path.summary.id);
  const progress = path.myProgress;
  const current: PathStage | undefined = path.stages.find((stage) => stage.isCurrent);

  return (
    <section className={styles.enroll} aria-labelledby="enroll-title">
      <h2 id="enroll-title" className={styles.enrollTitle}>
        <Icon name="route" size={20} /> {t('title')}
      </h2>

      {status === 'guest' ? (
        <>
          <p className={styles.text}>{t('guestText')}</p>
          <ButtonLink to={paths.loginWithReturn(location.pathname)} variant="ink">
            {t('signIn')}
          </ButtonLink>
        </>
      ) : !progress ? (
        <div className={styles.skeleton} aria-busy="true" />
      ) : !progress.enrolled ? (
        <>
          <p className={styles.text}>{t('startText')}</p>
          {progress.completedStages > 0 && (
            <p className={styles.text}>
              {t('alreadyDone', { n: formatCount(progress.completedStages) })}
            </p>
          )}
          <Button
            variant="red"
            disabled={start.isPending}
            onClick={() => {
              start.mutate();
            }}
          >
            {start.isPending ? t('starting') : t('start')}
          </Button>
        </>
      ) : (
        <>
          <div
            className={styles.bar}
            role="progressbar"
            aria-label={t('progressLabel')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percent}
          >
            <span style={{ inlineSize: `${String(progress.percent)}%` }} />
          </div>
          <p className={styles.text}>
            {t('done', {
              done: formatCount(progress.completedStages),
              total: formatCount(progress.totalStages),
              percent: formatPercent(progress.percent),
            })}
          </p>
          {progress.startedAtUtc && (
            <p className={styles.muted}>
              {t('started', { date: formatDate(progress.startedAtUtc) })}
            </p>
          )}
          {current ? (
            <p className={styles.text}>
              <Trans
                t={t}
                i18nKey="next"
                values={{ title: current.book.title }}
                components={{ b: <b /> }}
              />
            </p>
          ) : (
            <p className={styles.complete}>
              <Icon name="check" size={16} /> {t('finished')}
            </p>
          )}
          <div className={styles.actions}>
            <ButtonLink to={paths.account.library} variant="ink" size="sm">
              {t('update')}
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
        </>
      )}
    </section>
  );
}