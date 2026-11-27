import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { addToCartWithFeedback } from '@/features/catalog/addToCart';
import { BookCover } from '@/features/catalog/components/BookCover';
import { cx } from '@/shared/lib/cx';
import { formatCount, formatMoney, volumesLabel } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { Icon } from '@/shared/ui/Icon/Icon';

import type { PathStage } from '../api';
import { durationPhrase, pagesPhrase } from '../format';

import styles from './PathTimeline.module.css';

/** One stage on the vertical timeline (spec 5.5). */
export function PathStageItem({ stage }: { stage: PathStage }) {
  const { t } = useTranslation('paths', { keyPrefix: 'stage' });
  const { book } = stage;
  const edition =
    book.editionLabel ?? (book.volumes && book.volumes > 1 ? volumesLabel(book.volumes) : null);

  return (
    <li
      className={cx(
        styles.stage,
        stage.finished && styles.finished,
        stage.isCurrent && styles.current,
      )}
      aria-current={stage.isCurrent ? 'step' : undefined}
    >
      <span className={styles.marker} aria-hidden="true">
        {stage.finished ? <Icon name="check" size={18} /> : formatCount(stage.stageNumber)}
      </span>

      <div className={styles.card}>
        <Link to={paths.book(book.slug)} className={styles.cover} tabIndex={-1} aria-hidden="true">
          <BookCover
            title={book.title}
            src={book.coverImageUrl}
            srcSet={book.coverImageSrcSet}
            sizes="(min-width: 768px) 120px, 80px"
          />
        </Link>

        <div className={styles.body}>
          <p className={styles.kicker}>
            {t('kicker', { n: formatCount(stage.stageNumber) })}
            {stage.isCurrent && <b>{t('here')}</b>}
          </p>
          <h3 className={styles.title}>
            <Link to={paths.book(book.slug)}>{book.title}</Link>
          </h3>
          <p className={styles.author}>
            {book.author}
            {edition && ` · ${edition}`}
          </p>
          <p className={styles.reason}>
            <span className={styles.why}>{t('why')}</span> {stage.reason}
          </p>
          <ul className={styles.tags}>
            {stage.estimatedWeeks !== null && (
              <li>
                <span aria-hidden="true">◷ </span>
                {durationPhrase(stage.estimatedWeeks)}
              </li>
            )}
            {stage.pageCount > 0 && <li>{pagesPhrase(stage.pageCount)}</li>}
          </ul>
        </div>

        <div className={styles.action}>
          {stage.finished ? (
            <p className={styles.done}>
              <Icon name="check" size={16} /> {t('done')}
            </p>
          ) : stage.owned ? (
            <>
              <p className={styles.owned}>
                <Icon name="book" size={16} /> {t('inLibrary')}
              </p>
              <Link to={paths.account.library} className={styles.textLink}>
                {t('updateProgress')}
              </Link>
            </>
          ) : (
            <>
              <p className={styles.price}>
                {formatMoney(book.price, book.currency)}
                {book.oldPrice !== null && book.oldPrice > book.price && (
                  <s className={styles.old}>{formatMoney(book.oldPrice, book.currency)}</s>
                )}
              </p>
              {book.inStock ? (
                <Button
                  variant={stage.isCurrent ? 'red' : 'ghost'}
                  size="sm"
                  aria-label={t('addLabel', { title: book.title })}
                  onClick={() => {
                    addToCartWithFeedback({ id: book.id, title: book.title });
                  }}
                >
                  {t('add')}
                </Button>
              ) : (
                <>
                  <span className={styles.out}>{t('out')}</span>
                  <Link to={paths.book(book.slug)} className={styles.textLink}>
                    {t('notify')}
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </li>
  );
}