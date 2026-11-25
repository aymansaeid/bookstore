import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';

import { paths } from '@/app/paths';
import { BookCover } from '@/features/catalog/components/BookCover';
import { useCatalogSearch } from '@/features/catalog/queries';
import { useStoreStats } from '@/features/store/queries';
import { formatAmount, formatCount, formatMoney } from '@/shared/lib/format';
import { EffendiAvatar } from '@/shared/ui/EffendiAvatar/EffendiAvatar';
import { Icon } from '@/shared/ui/Icon/Icon';

import styles from './HomeHero.module.css';

const SUGGESTIONS = ['hero.suggestion1', 'hero.suggestion2', 'hero.suggestion3'] as const;

const askUrl = (q: string) => `${paths.askEfendi}?${new URLSearchParams({ q }).toString()}`;

/** Live figures from /api/store/stats; each one only when it is meaningful. */
function TrustFigures() {
  const { t } = useTranslation('home');
  const { data: stats } = useStoreStats();
  if (!stats) return null;
  const figures = [
    stats.bookCount > 0 && { value: formatCount(stats.bookCount), label: t('figures.books') },
    stats.muhaqqiqCount > 0 && {
      value: formatCount(stats.muhaqqiqCount),
      label: t('figures.muhaqqiqs'),
    },
    stats.averageRating !== null &&
      stats.reviewCount > 0 && {
        value: `${formatAmount(stats.averageRating)} ★`,
        label: t('figures.reviews', {
          count: stats.reviewCount,
          n: formatCount(stats.reviewCount),
        }),
      },
    stats.countriesShippedTo > 0 && {
      value: formatCount(stats.countriesShippedTo),
      label: t('figures.countries'),
    },
  ].filter((item) => item !== false);
  if (figures.length === 0) return null;

  return (
    <dl className={styles.figures}>
      {figures.map((figure) => (
        <div key={figure.label}>
          <dd>{figure.value}</dd>
          <dt>{figure.label}</dt>
        </div>
      ))}
    </dl>
  );
}

/** The left stage (spec 5.1): a shelf of spines and the two best-sellers' covers. */
function Stage() {
  const { t } = useTranslation('home');
  const query = useCatalogSearch({ sort: 'Bestselling', pageSize: 2 });
  const books = query.data?.results.items ?? [];
  const top = books[0];

  return (
    <div className={styles.stage}>
      <div className={styles.spines} aria-hidden="true">
        {Array.from({ length: 7 }, (_, index) => (
          <span key={index}>{formatCount(index + 1)}</span>
        ))}
      </div>
      <div className={styles.covers}>
        {books.map((book, index) => (
          <Link
            key={book.id}
            to={paths.book(book.slug)}
            className={index === 0 ? styles.front : styles.back}
            tabIndex={-1}
            aria-hidden="true"
          >
            <BookCover
              title={book.title}
              src={book.coverImageUrl}
              srcSet={book.coverImageSrcSet}
              sizes="240px"
              priority
            />
          </Link>
        ))}
      </div>
      <div className={styles.plank} aria-hidden="true" />
      {top && (
        <Link to={paths.book(top.slug)} className={styles.float}>
          <span className={styles.floatLabel}>{t('hero.bestThisMonth')}</span>
          <b className={styles.floatTitle}>{top.title}</b>
          <span className={styles.floatPrice}>{formatMoney(top.price, top.currency)}</span>
        </Link>
      )}
    </div>
  );
}

/** Home hero (spec 5.1 §1): title, the «اسأل أفندي» box, live figures, the stage. */
export function HomeHero() {
  const { t } = useTranslation('home');
  const navigate = useNavigate();
  const [question, setQuestion] = useState('');

  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={`wrap ${styles.inner}`}>
        <div className={styles.copy}>
          <p className={styles.badge}>{t('hero.badge')}</p>
          <h1 id="hero-title" className={styles.title}>
            <Trans t={t} i18nKey="hero.title" components={{ em: <em /> }} />
          </h1>
          <p className={styles.lead}>{t('hero.lead')}</p>

          <form
            className={styles.ask}
            role="search"
            aria-label={t('hero.ask')}
            onSubmit={(event) => {
              event.preventDefault();
              const q = question.trim();
              void navigate(q ? askUrl(q) : paths.askEfendi);
            }}
          >
            <div className={styles.askRow}>
              <EffendiAvatar size={44} className={styles.askAvatar} />
              <label htmlFor="hero-ask" className="sr-only">
                {t('hero.ask')}
              </label>
              <input
                id="hero-ask"
                className={styles.askInput}
                type="text"
                maxLength={300}
                placeholder={t('hero.placeholder')}
                value={question}
                onChange={(event) => {
                  setQuestion(event.target.value);
                }}
              />
              <Link
                to={`${paths.askEfendi}?mode=photo`}
                className={styles.tool}
                aria-label={t('hero.photo')}
              >
                <Icon name="cam" size={20} />
              </Link>
              <Link
                to={`${paths.askEfendi}?mode=voice`}
                className={styles.tool}
                aria-label={t('hero.voice')}
              >
                <Icon name="mic" size={20} />
              </Link>
              <button type="submit" className={styles.send} aria-label={t('hero.ask')}>
                <Icon name="send" size={20} />
              </button>
            </div>
            <ul className={styles.suggestions} aria-label={t('hero.suggestionsLabel')}>
              {SUGGESTIONS.map((key) => {
                const suggestion = t(key);
                return (
                  <li key={key}>
                    <Link to={askUrl(suggestion)} className={styles.suggestion}>
                      {suggestion}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </form>

          <TrustFigures />
        </div>

        <Stage />
      </div>
    </section>
  );
}