import { Trans, useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { paths } from '@/app/paths';
import { PathCard } from '@/features/paths/components/PathCard';
import { useReadingPaths } from '@/features/paths/queries';
import { levelLabel, type ReaderLevel } from '@/shared/api/enums';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { Button, ButtonLink } from '@/shared/ui/Button/Button';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';
import { Spark } from '@/shared/ui/Spark/Spark';

import styles from './ReadingPaths.module.css';

const LEVELS: ReaderLevel[] = ['Beginner', 'Intermediate', 'Specialist'];

const isLevel = (value: string | null): value is ReaderLevel =>
  LEVELS.includes(value as ReaderLevel);

/** «مسارات القراءة» (spec 5.5, API §7d): every curated path, filterable by level. */
export default function ReadingPathsPage() {
  const { t } = useTranslation('paths', { keyPrefix: 'list' });
  const { t: tCommon } = useTranslation();
  const [params, setParams] = useSearchParams();
  const raw = params.get('level');
  const level = isLevel(raw) ? raw : null;
  const query = useReadingPaths();
  const shown = query.data?.filter((path) => level === null || path.level === level);

  const setLevel = (next: ReaderLevel | null) => {
    setParams(next ? { level: next } : {}, { replace: true });
  };

  return (
    <>
      <DocumentTitle title={t('title')} />
      <section className={styles.hero} aria-labelledby="paths-title">
        <div className="wrap">
          <p className={styles.kicker}>{t('title')}</p>
          <h1 id="paths-title" className={styles.heroTitle}>
            {t('heroTitle')}
            <br />
            <span>{t('heroTitleEm')}</span>
          </h1>
          <p className={styles.lead}>{t('lead')}</p>
        </div>
      </section>

      <div className={cx('wrap', styles.body)}>
        <aside className={styles.soon}>
          <Spark size={18} />
          <p>
            <Trans t={t} i18nKey="soon" components={{ b: <b /> }} />
          </p>
          <ButtonLink to={paths.askEfendi} variant="ghost" size="sm">
            {t('meet')}
          </ButtonLink>
        </aside>

        <div className={styles.filters} role="group" aria-label={t('levels')}>
          <button
            type="button"
            className={cx(styles.filter, level === null && styles.on)}
            aria-pressed={level === null}
            onClick={() => {
              setLevel(null);
            }}
          >
            {t('allLevels')}
          </button>
          {LEVELS.map((value) => (
            <button
              key={value}
              type="button"
              className={cx(styles.filter, level === value && styles.on)}
              aria-pressed={level === value}
              onClick={() => {
                setLevel(value);
              }}
            >
              {levelLabel(value)}
            </button>
          ))}
        </div>

        {query.isError ? (
          <div className={styles.state} role="alert">
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
        ) : !shown ? (
          <div className={styles.grid} aria-busy="true" aria-label={t('loading')}>
            {[0, 1, 2].map((key) => (
              <div key={key} className={styles.skeleton} />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <div className={styles.state}>
            <p>{level ? t('noneLevel', { level: levelLabel(level) }) : t('none')}</p>
            {level && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLevel(null);
                }}
              >
                {t('showAll')}
              </Button>
            )}
          </div>
        ) : (
          <>
            <h2 className="sr-only">{t('heading')}</h2>
            <ul className={styles.grid}>
              {shown.map((path) => (
                <li key={path.id} className={styles.item}>
                  <PathCard path={path} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}