import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { paths } from '@/app/paths';
import { BookCover } from '@/features/catalog/components/BookCover';
import { useCatalogSearch } from '@/features/catalog/queries';
import { useStoreStats } from '@/features/store/queries';
import { formatAmount, formatCount, formatMoney } from '@/shared/lib/format';
import { EffendiAvatar } from '@/shared/ui/EffendiAvatar/EffendiAvatar';
import { Icon } from '@/shared/ui/Icon/Icon';

import styles from './HomeHero.module.css';

const SUGGESTIONS = [
  'ما الفرق بين طبعات المسند؟',
  'هدية لطالب علم بميزانية ٥٠٠ ₺',
  'كتب الأرناؤوط في الحديث',
];

const askUrl = (q: string) => `${paths.askEfendi}?${new URLSearchParams({ q }).toString()}`;

/** Live figures from /api/store/stats; each one only when it is meaningful. */
function TrustFigures() {
  const { data: stats } = useStoreStats();
  if (!stats) return null;
  const figures = [
    stats.bookCount > 0 && { value: formatCount(stats.bookCount), label: 'عنوان محقّق' },
    stats.muhaqqiqCount > 0 && {
      value: formatCount(stats.muhaqqiqCount),
      label: 'محقّقاً وعالماً',
    },
    stats.averageRating !== null &&
      stats.reviewCount > 0 && {
        value: `${formatAmount(stats.averageRating)} ★`,
        label: `من ${formatCount(stats.reviewCount)} مراجعة`,
      },
    stats.countriesShippedTo > 0 && {
      value: formatCount(stats.countriesShippedTo),
      label: 'دولة نشحن إليها',
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
          <span className={styles.floatLabel}>الأكثر طلباً هذا الشهر</span>
          <b className={styles.floatTitle}>{top.title}</b>
          <span className={styles.floatPrice}>{formatMoney(top.price, top.currency)}</span>
        </Link>
      )}
    </div>
  );
}

/** Home hero (spec 5.1 §1): title, the «اسأل أفندي» box, live figures, the stage. */
export function HomeHero() {
  const navigate = useNavigate();
  const [question, setQuestion] = useState('');

  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={`wrap ${styles.inner}`}>
        <div className={styles.copy}>
          <p className={styles.badge}>كتب التراث المحقَّقة من الرسالة ناشرون</p>
          <h1 id="hero-title" className={styles.title}>
            كنوز التراث المحقَّق، <em>يختارها لك أفندي</em>
          </h1>
          <p className={styles.lead}>
            إصدارات مؤسسة الرسالة ناشرون وأمهات الكتب بتحقيقات موثوقة. صِف ما تبحث عنه بكلماتك، ودع
            أفندي يدلّك على الطبعة الأنسب لمستواك.
          </p>

          <form
            className={styles.ask}
            role="search"
            aria-label="اسأل أفندي"
            onSubmit={(event) => {
              event.preventDefault();
              const q = question.trim();
              void navigate(q ? askUrl(q) : paths.askEfendi);
            }}
          >
            <div className={styles.askRow}>
              <EffendiAvatar size={44} className={styles.askAvatar} />
              <label htmlFor="hero-ask" className="sr-only">
                اسأل أفندي
              </label>
              <input
                id="hero-ask"
                className={styles.askInput}
                type="text"
                maxLength={300}
                placeholder="أنا طالب مبتدئ، أريد كتاباً في السيرة النبوية بتحقيق موثوق"
                value={question}
                onChange={(event) => {
                  setQuestion(event.target.value);
                }}
              />
              <Link
                to={`${paths.askEfendi}?mode=photo`}
                className={styles.tool}
                aria-label="ابحث بصورة الغلاف"
              >
                <Icon name="cam" size={20} />
              </Link>
              <Link
                to={`${paths.askEfendi}?mode=voice`}
                className={styles.tool}
                aria-label="اسأل بصوتك"
              >
                <Icon name="mic" size={20} />
              </Link>
              <button type="submit" className={styles.send} aria-label="اسأل أفندي">
                <Icon name="send" size={20} />
              </button>
            </div>
            <ul className={styles.suggestions} aria-label="أسئلة مقترحة">
              {SUGGESTIONS.map((suggestion) => (
                <li key={suggestion}>
                  <Link to={askUrl(suggestion)} className={styles.suggestion}>
                    {suggestion}
                  </Link>
                </li>
              ))}
            </ul>
          </form>

          <TrustFigures />
        </div>

        <Stage />
      </div>
    </section>
  );
}
