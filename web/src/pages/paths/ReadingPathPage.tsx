import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { UI_DIRECTION } from '@/app/locale';
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
import { booksPhrase, formatPercent } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';
import { Icon } from '@/shared/ui/Icon/Icon';

import styles from './ReadingPath.module.css';

/** A reading path (spec 5.5, API §7d): timeline, your progress, and the path price. */
export default function ReadingPathPage() {
  const { t } = useTranslation('paths', { keyPrefix: 'page' });
  const { t: tCommon } = useTranslation();
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
          {tCommon('ui.retry')}
        </Button>
      </div>
    );
  }

  const summary = path?.summary;
  const progress = path?.myProgress;

  return (
    <>
      <DocumentTitle title={summary?.title ?? t('tabTitle')} />
      <section className={styles.hero} aria-labelledby="path-title">
        <div className="wrap">
          <Link to={paths.readingPaths} className={styles.back}>
            <Icon name={UI_DIRECTION === 'rtl' ? 'arrowr' : 'arrow'} size={16} /> {t('all')}
          </Link>
          <p className={styles.kicker}>
            {t('kicker')}
            {summary && ` · ${levelLabel(summary.level)}`}
          </p>
          <h1 id="path-title" className={styles.title}>
            {summary?.title ?? t('loadingTitle')}
          </h1>
          {summary?.description && <p className={styles.lead}>{summary.description}</p>}
          {summary && (
            <dl className={styles.stats}>
              <div>
                <dt>{t('duration')}</dt>
                <dd>{durationPhrase(summary.estimatedWeeks)}</dd>
              </div>
              <div>
                <dt>{t('books')}</dt>
                <dd>{booksPhrase(summary.stageCount)}</dd>
              </div>
              {progress?.enrolled ? (
                <div>
                  <dt>{t('done')}</dt>
                  <dd>{formatPercent(progress.percent)}</dd>
                </div>
              ) : (
                <div>
                  <dt>{t('readers')}</dt>
                  <dd>
                    {summary.enrollmentCount === 0
                      ? t('beFirst')
                      : t('startedBy', { readers: readersPhrase(summary.enrollmentCount) })}
                  </dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </section>

      <div className={cx('wrap', styles.layout)}>
        {!path ? (
          <div className={styles.loading} aria-busy="true" aria-label={t('loading')} />
        ) : (
          <>
            <div className={styles.side}>
              <EnrollCard path={path} />
            </div>

            <div className={styles.main}>
              <h2 className={styles.sectionTitle}>{t('stages')}</h2>
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
                    <b>{t('perkLibraryTitle')}</b>
                    <p>{t('perkLibraryText')}</p>
                  </div>
                </li>
                <li>
                  <span className={styles.perkIcon} aria-hidden="true">
                    <Icon name="book" size={20} />
                  </span>
                  <div>
                    <b>{t('perkOwnedTitle')}</b>
                    <p>{t('perkOwnedText')}</p>
                  </div>
                </li>
                {path.summary.pricing.discountPercentage > 0 && (
                  <li>
                    <span className={styles.perkIcon} aria-hidden="true">
                      <Icon name="gift" size={20} />
                    </span>
                    <div>
                      <b>{t('perkDiscountTitle')}</b>
                      <p>
                        {t('perkDiscountText', {
                          percent: formatPercent(path.summary.pricing.discountPercentage),
                        })}
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