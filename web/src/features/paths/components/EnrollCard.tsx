import { useLocation } from 'react-router';

import { paths } from '@/app/paths';
import { useSession } from '@/features/auth/session';
import { formatCount, formatDate } from '@/shared/lib/format';
import { Button, ButtonLink } from '@/shared/ui/Button/Button';
import { Icon } from '@/shared/ui/Icon/Icon';

import type { PathStage, ReadingPathDetail } from '../api';
import { useEnrollment } from '../queries';

import styles from './PathPanels.module.css';

/** «ابدأ المسار» and your progress (API §7d). Free; nothing is bought here. */
export function EnrollCard({ path }: { path: ReadingPathDetail }) {
  const { status } = useSession();
  const location = useLocation();
  const { start, leave } = useEnrollment(path.summary.id);
  const progress = path.myProgress;
  const current: PathStage | undefined = path.stages.find((stage) => stage.isCurrent);

  return (
    <section className={styles.enroll} aria-labelledby="enroll-title">
      <h2 id="enroll-title" className={styles.enrollTitle}>
        <Icon name="route" size={20} /> مسارك
      </h2>

      {status === 'guest' ? (
        <>
          <p className={styles.text}>
            سجّل الدخول لتبدأ المسار: نحسب تقدّمك من مكتبتك، ونريك أين وصلت وما الكتاب التالي، ولا
            نطلب منك شراء ما تملكه.
          </p>
          <ButtonLink to={paths.loginWithReturn(location.pathname)} variant="ink">
            سجّل الدخول لتبدأ
          </ButtonLink>
        </>
      ) : !progress ? (
        <div className={styles.skeleton} aria-busy="true" />
      ) : !progress.enrolled ? (
        <>
          <p className={styles.text}>
            ابدأ المسار مجاناً لتتابع تقدّمك. كل كتاب تُنهيه في «مكتبتي» يُتمّ مرحلته تلقائياً.
          </p>
          {progress.completedStages > 0 && (
            <p className={styles.text}>
              أنهيت {formatCount(progress.completedStages)} من كتبه بالفعل.
            </p>
          )}
          <Button
            variant="red"
            disabled={start.isPending}
            onClick={() => {
              start.mutate();
            }}
          >
            {start.isPending ? 'جارٍ البدء…' : 'ابدأ المسار'}
          </Button>
        </>
      ) : (
        <>
          <div
            className={styles.bar}
            role="progressbar"
            aria-label="تقدّمك في المسار"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percent}
          >
            <span style={{ inlineSize: `${String(progress.percent)}%` }} />
          </div>
          <p className={styles.text}>
            أنجزت {formatCount(progress.completedStages)} من {formatCount(progress.totalStages)}{' '}
            مراحل · {formatCount(progress.percent)}٪
          </p>
          {progress.startedAtUtc && (
            <p className={styles.muted}>بدأته في {formatDate(progress.startedAtUtc)}</p>
          )}
          {current ? (
            <p className={styles.text}>
              التالي: <b>{current.book.title}</b>
            </p>
          ) : (
            <p className={styles.complete}>
              <Icon name="check" size={16} /> أتممت هذا المسار. بارك الله في علمك.
            </p>
          )}
          <div className={styles.actions}>
            <ButtonLink to={paths.account.library} variant="ink" size="sm">
              حدّث تقدّمك في مكتبتي
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
        </>
      )}
    </section>
  );
}
