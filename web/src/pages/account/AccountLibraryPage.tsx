import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { AccountHeader } from '@/features/account/components/AccountHeader';
import shared from '@/features/account/components/account.module.css';
import { BookCover } from '@/features/catalog/components/BookCover';
import type { LibraryItem, ReadingStatus } from '@/features/library/api';
import { useLibrary, useToggleOwned, useUpdateProgress } from '@/features/library/queries';
import { ownershipLabel, readingStatusLabel } from '@/shared/api/enums';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { booksPhrase, formatCount, formatPercent } from '@/shared/lib/format';
import { Button, ButtonLink } from '@/shared/ui/Button/Button';

import styles from './AccountLibraryPage.module.css';

const STATUSES: ReadingStatus[] = ['NotStarted', 'Reading', 'Finished'];

function ProgressEditor({ item, onDone }: { item: LibraryItem; onDone: () => void }) {
  const { t } = useTranslation('account');
  const update = useUpdateProgress();
  const [status, setStatus] = useState<ReadingStatus>(item.readingStatus);
  const [percent, setPercent] = useState(
    item.readingStatus === 'Reading' ? item.progressPercent : 10,
  );
  const id = `progress-${String(item.book.id)}`;

  return (
    <form
      className={styles.editor}
      onSubmit={(event) => {
        event.preventDefault();
        update.mutate(
          {
            bookId: item.book.id,
            status,
            percent: status === 'Finished' ? 100 : status === 'NotStarted' ? 0 : percent,
          },
          { onSuccess: onDone },
        );
      }}
    >
      <fieldset className={styles.statuses}>
        <legend className="sr-only">{t('library.statusLegend')}</legend>
        {STATUSES.map((value) => (
          <label key={value} className={cx(styles.status, status === value && styles.statusOn)}>
            <input
              type="radio"
              name={`${id}-status`}
              checked={status === value}
              onChange={() => {
                setStatus(value);
              }}
            />
            {readingStatusLabel(value)}
          </label>
        ))}
      </fieldset>
      {status === 'Reading' && (
        <label htmlFor={id} className={styles.range}>
          <span>{t('library.read', { percent: formatPercent(percent) })}</span>
          <input
            id={id}
            type="range"
            min={1}
            max={99}
            value={percent}
            onChange={(event) => {
              setPercent(Number(event.target.value));
            }}
          />
        </label>
      )}
      <div className={styles.editorActions}>
        <Button type="submit" variant="ink" size="sm" disabled={update.isPending}>
          {update.isPending ? t('shared.saving') : t('shared.save')}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDone}>
          {t('shared.cancel')}
        </Button>
      </div>
    </form>
  );
}

function ShelfBook({ item }: { item: LibraryItem }) {
  const { t } = useTranslation('account');
  const [editing, setEditing] = useState(false);
  const toggleOwned = useToggleOwned();
  const { book } = item;

  return (
    <li className={styles.book}>
      <Link to={paths.book(book.slug)} className={styles.coverLink} aria-label={book.title}>
        <BookCover
          title={book.title}
          src={book.coverImageUrl}
          sizes="(min-width: 1280px) 180px, (min-width: 640px) 30vw, 45vw"
          className={styles.cover}
        />
        {item.readingStatus === 'Reading' && (
          <span className={styles.bar} aria-hidden="true">
            <span style={{ inlineSize: `${String(item.progressPercent)}%` }} />
          </span>
        )}
      </Link>
      <div className={styles.meta}>
        <Link to={paths.book(book.slug)} className={styles.title}>
          {book.title}
        </Link>
        <span className={styles.author}>{book.author}</span>
        <span className={cx(styles.state, styles[item.readingStatus])}>
          {item.readingStatus === 'Reading'
            ? t('library.readingNow', { percent: formatPercent(item.progressPercent) })
            : readingStatusLabel(item.readingStatus)}
        </span>
        <span className={styles.ownership}>{ownershipLabel(item.ownership)}</span>
      </div>

      {editing ? (
        <ProgressEditor
          item={item}
          onDone={() => {
            setEditing(false);
          }}
        />
      ) : (
        <div className={styles.actions}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditing(true);
            }}
          >
            {t('library.update')}
          </Button>
          {item.ownership === 'AddedManually' && (
            <Button
              variant="ghost"
              size="sm"
              disabled={toggleOwned.isPending}
              onClick={() => {
                toggleOwned.mutate({ bookId: book.id, owned: true });
              }}
            >
              {t('shared.remove')}
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

/** «مكتبتي» (spec 5.9): the shelf, reading progress and stats (API §7b). */
export default function AccountLibraryPage() {
  const { t } = useTranslation('account');
  const library = useLibrary();
  const data = library.data;
  const current = data?.items.find((item) => item.book.id === data.currentlyReadingBookId);

  return (
    <>
      <AccountHeader title={t('library.title')} description={t('library.lead')} />

      {library.isError ? (
        <div className={shared.empty} role="alert">
          <p>{errorMessage(library.error)}</p>
        </div>
      ) : !data ? (
        <div className={shared.skeleton} aria-busy="true" aria-label={t('library.loading')} />
      ) : data.items.length === 0 ? (
        <div className={shared.empty}>
          <p>{t('library.empty')}</p>
          <p className={shared.muted}>{t('library.emptyHint')}</p>
          <ButtonLink to={paths.search} variant="ink" size="sm">
            {t('shared.browse')}
          </ButtonLink>
        </div>
      ) : (
        <>
          <dl className={styles.stats}>
            <div>
              <dt>{t('library.inLibrary')}</dt>
              <dd>{formatCount(data.stats.totalBooks)}</dd>
            </div>
            <div>
              <dt>{t('library.reading')}</dt>
              <dd>{formatCount(data.stats.reading)}</dd>
            </div>
            <div>
              <dt>{t('library.finished')}</dt>
              <dd>{formatCount(data.stats.finished)}</dd>
            </div>
            <div>
              <dt>{t('library.pagesRead')}</dt>
              <dd>
                {formatCount(data.stats.pagesRead)}
                <small> / {formatCount(data.stats.totalPages)}</small>
              </dd>
            </div>
          </dl>

          {current && (
            <section className={styles.now} aria-labelledby="now-title">
              <BookCover title={current.book.title} src={current.book.coverImageUrl} sizes="88px" />
              <div>
                <h2 id="now-title" className={styles.nowLabel}>
                  {t('library.now')}
                </h2>
                <p className={styles.nowTitle}>{current.book.title}</p>
                <div
                  className={styles.nowBar}
                  role="progressbar"
                  aria-label={t('library.progress')}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={current.progressPercent}
                >
                  <span style={{ inlineSize: `${String(current.progressPercent)}%` }} />
                </div>
                <p className={shared.muted}>{formatPercent(current.progressPercent)}</p>
              </div>
            </section>
          )}

          <ul className={styles.shelf}>
            {data.items.map((item) => (
              <ShelfBook key={item.book.id} item={item} />
            ))}
          </ul>
          <p className={shared.muted}>
            {t('library.thisYear', { books: booksPhrase(data.stats.finishedThisYear) })}
          </p>
        </>
      )}
    </>
  );
}