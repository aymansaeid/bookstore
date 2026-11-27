import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { BookCover } from '@/features/catalog/components/BookCover';
import { levelLabel } from '@/shared/api/enums';
import { cx } from '@/shared/lib/cx';
import { booksPhrase, formatCount, formatMoney, formatPercent } from '@/shared/lib/format';
import { buttonClass } from '@/shared/ui/Button/buttonClass';

import type { ReadingPathSummary } from '../api';
import { durationPhrase } from '../format';

import styles from './PathCard.module.css';

/**
 * Path card (home «مسارات القراءة», spec 5.1; and the /paths list): the
 * first four covers on a dotted line, numbered. The most chosen path is dark.
 */
export function PathCard({ path }: { path: ReadingPathSummary }) {
  const { t } = useTranslation('paths', { keyPrefix: 'card' });
  const dark = path.isMostChosen;
  const { pricing } = path;
  const titleId = `path-${String(path.id)}`;

  return (
    <article className={cx(styles.card, dark && styles.dark)} aria-labelledby={titleId}>
      <div className={styles.top}>
        <span className={styles.chip}>
          {dark && <span aria-hidden="true">✦ </span>}
          {dark ? t('mostChosen') : `${levelLabel(path.level)} · ${booksPhrase(path.stageCount)}`}
        </span>
        <span className={styles.duration}>{durationPhrase(path.estimatedWeeks)}</span>
      </div>

      <h3 id={titleId} className={styles.title}>
        <Link to={paths.readingPath(path.slug)} className={styles.link}>
          {path.title}
        </Link>
      </h3>
      {path.description && <p className={styles.description}>{path.description}</p>}

      <ol className={styles.covers} aria-label={t('firstBooks')}>
        {path.covers.map((cover) => (
          <li key={cover.stageNumber} className={styles.cover}>
            <BookCover title={cover.title} src={cover.coverThumbnailUrl} sizes="80px" />
            <span className={styles.number} aria-hidden="true">
              {formatCount(cover.stageNumber)}
            </span>
            <span className="sr-only">
              {t('stage', { n: formatCount(cover.stageNumber), title: cover.title })}
            </span>
          </li>
        ))}
      </ol>

      <div className={styles.foot}>
        <div>
          <p className={styles.price}>{formatMoney(pricing.discountedPrice, pricing.currency)}</p>
          <p className={styles.discount}>
            {pricing.discountPercentage > 0
              ? t('discount', { percent: formatPercent(pricing.discountPercentage) })
              : booksPhrase(path.stageCount)}
          </p>
        </div>
        {/* The whole card is clickable through this link's ::after. */}
        <span className={buttonClass(dark ? 'red' : 'ink', 'sm')} aria-hidden="true">
          {t('start')}
        </span>
      </div>
    </article>
  );
}