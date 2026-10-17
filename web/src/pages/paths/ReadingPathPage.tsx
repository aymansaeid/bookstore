import { Link, useParams } from 'react-router';

import { paths } from '@/app/paths';
import { EnrollCard } from '@/features/paths/components/EnrollCard';
import { PathStageItem } from '@/features/paths/components/PathStageItem';
import timeline from '@/features/paths/components/PathTimeline.module.css';
import { PathTotal } from '@/features/paths/components/PathTotal';
import { durationPhrase, readersPhrase } from '@/features/paths/format';
import { useReadingPath } from '@/features/paths/queries';
import NotFoundPage from '@/pages/not-found/NotFoundPage';
import { isApiError } from '@/shared/api/ApiError';
import { levelLabel } from '@/shared/api/enums';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { booksPhrase, formatCount } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';
import { Icon } from '@/shared/ui/Icon/Icon';

import styles from './ReadingPath.module.css';

/** A reading path (spec 5.5, API §7d): timeline, your progress, and the path price. */
export default function ReadingPathPage() {
  const { slug = '' } = useParams();
  const query = useReadingPath(slug);
  const path = query.data;

  if (query.isError) {
    if (isApiError(query.error) && query.error.status === 404) return <NotFoundPage />;
    return (
      <div className={cx('wrap', styles.error)} role="alert">
        <p>{errorMessage(query.error)}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            void query.refetch();
          }}
        >
          أعد المحاولة
        </Button>
      </div>
    );
  }

  const summary = path?.summary;
  const progress = path?.myProgress;

  return (
    <>
      <DocumentTitle title={summary?.title ?? 'مسار القراءة'} />
      <section className={styles.hero} aria-labelledby="path-title">
        <div className="wrap">
          <Link to={paths.readingPaths} className={styles.back}>
            <Icon name="arrowr" size={16} /> كل المسارات
          </Link>
          <p className={styles.kicker}>مسار قراءة{summary && ` · ${levelLabel(summary.level)}`}</p>
          <h1 id="path-title" className={styles.title}>
            {summary?.title ?? 'جارٍ التحميل…'}
          </h1>
          {summary?.description && <p className={styles.lead}>{summary.description}</p>}
          {summary && (
            <dl className={styles.stats}>
              <div>
                <dt>المدة</dt>
                <dd>{durationPhrase(summary.estimatedWeeks)}</dd>
              </div>
              <div>
                <dt>الكتب</dt>
                <dd>{booksPhrase(summary.stageCount)}</dd>
              </div>
              {progress?.enrolled ? (
                <div>
                  <dt>أنجزت</dt>
                  <dd>{formatCount(progress.percent)}٪</dd>
                </div>
              ) : (
                <div>
                  <dt>القرّاء</dt>
                  <dd>{readersPhrase(summary.enrollmentCount)}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </section>

      <div className={cx('wrap', styles.layout)}>
        {!path ? (
          <div className={styles.loading} aria-busy="true" aria-label="جارٍ تحميل المسار" />
        ) : (
          <>
            <div className={styles.side}>
              <EnrollCard path={path} />
            </div>

            <div className={styles.main}>
              <h2 className={styles.sectionTitle}>مراحل المسار</h2>
              <ol className={timeline.timeline}>
                {path.stages.map((stage) => (
                  <PathStageItem key={stage.stageNumber} stage={stage} />
                ))}
              </ol>

              <PathTotal path={path} />

              <ul className={styles.perks}>
                <li>
                  <span className={styles.perkIcon} aria-hidden="true">
                    <Icon name="route" size={20} />
                  </span>
                  <div>
                    <b>تقدّم من مكتبتك</b>
                    <p>كل كتاب تُنهيه في «مكتبتي» يُتمّ مرحلته تلقائياً.</p>
                  </div>
                </li>
                <li>
                  <span className={styles.perkIcon} aria-hidden="true">
                    <Icon name="book" size={20} />
                  </span>
                  <div>
                    <b>لا تدفع مرتين</b>
                    <p>ما تملكه من كتب المسار لا يدخل في سعره.</p>
                  </div>
                </li>
                {path.summary.pricing.discountPercentage > 0 && (
                  <li>
                    <span className={styles.perkIcon} aria-hidden="true">
                      <Icon name="gift" size={20} />
                    </span>
                    <div>
                      <b>خصم المسار</b>
                      <p>
                        {formatCount(path.summary.pricing.discountPercentage)}٪ على كتب المسار حين
                        تشتريها معاً.
                      </p>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          </>
        )}
      </div>
    </>
  );
}
