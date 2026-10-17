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
      <DocumentTitle title="مسارات القراءة" />
      <section className={styles.hero} aria-labelledby="paths-title">
        <div className="wrap">
          <p className={styles.kicker}>مسارات القراءة</p>
          <h1 id="paths-title" className={styles.heroTitle}>
            لا تعرف من أين تبدأ؟
            <br />
            <span>اتبع طريقاً مرسوماً</span>
          </h1>
          <p className={styles.lead}>
            مسارات متدرّجة يرتّبها طلاب علم متخصصون: لكل كتاب سبب، وتقدّمك يُحسب من مكتبتك، وخصم عند
            شراء المسار كاملاً.
          </p>
        </div>
      </section>

      <div className={cx('wrap', styles.body)}>
        <aside className={styles.soon}>
          <Spark size={18} />
          <p>
            <b>قريباً:</b> أفندي يرسم لك مساراً على مقاس هدفك ووقتك وميزانيتك.
          </p>
          <ButtonLink to={paths.askEfendi} variant="ghost" size="sm">
            تعرّف على أفندي
          </ButtonLink>
        </aside>

        <div className={styles.filters} role="group" aria-label="مستوى القارئ">
          <button
            type="button"
            className={cx(styles.filter, level === null && styles.on)}
            aria-pressed={level === null}
            onClick={() => {
              setLevel(null);
            }}
          >
            كل المستويات
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
              أعد المحاولة
            </Button>
          </div>
        ) : !shown ? (
          <div className={styles.grid} aria-busy="true" aria-label="جارٍ تحميل المسارات">
            {[0, 1, 2].map((key) => (
              <div key={key} className={styles.skeleton} />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <div className={styles.state}>
            <p>
              {level ? `لا مسارات لمستوى «${levelLabel(level)}» بعد.` : 'لا مسارات منشورة بعد.'}
            </p>
            {level && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLevel(null);
                }}
              >
                عرض كل المسارات
              </Button>
            )}
          </div>
        ) : (
          <>
            <h2 className="sr-only">المسارات</h2>
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
