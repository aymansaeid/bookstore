import { useTranslation } from 'react-i18next';

import { LANGUAGE_NAMES, UI_LOCALE } from '@/app/locale';
import type { PublicBook } from '@/features/catalog/types';
import { formatLabel } from '@/shared/api/enums';
import { formatCount, LIST_SEPARATOR, volumesLabel } from '@/shared/lib/format';
import { Icon } from '@/shared/ui/Icon/Icon';

import styles from './BookDetails.module.css';

/** The book's language in the page's language: «العربية», "Arabic", "Arapça". */
const languageNames = new Intl.DisplayNames([UI_LOCALE], { type: 'language' });
const languageName = (code: string): string => {
  try {
    return languageNames.of(code) ?? code;
  } catch {
    return (LANGUAGE_NAMES as Readonly<Record<string, string | undefined>>)[code] ?? code;
  }
};

export function BookSpecs({ book }: { book: PublicBook }) {
  const { t } = useTranslation('book', { keyPrefix: 'specs' });
  const cells = [
    { label: t('publisher'), value: book.publisher ?? '—' },
    {
      label: t('editing'),
      value:
        book.muhaqqiqs.length > 0 ? book.muhaqqiqs.map((m) => m.name).join(LIST_SEPARATOR) : '—',
    },
    { label: t('volumes'), value: volumesLabel(book.volumes ?? 1) },
    { label: t('binding'), value: formatLabel(book.format) },
    { label: t('pages'), value: formatCount(book.pageCount) },
    { label: t('language'), value: languageName(book.language) },
    { label: t('isbn'), value: book.isbn ?? '—', ltr: true },
  ];

  return (
    <dl className={styles.specs}>
      {cells.map((cell) => (
        <div key={cell.label} className={styles.spec}>
          <dt>{cell.label}</dt>
          <dd dir={cell.ltr ? 'ltr' : undefined}>{cell.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function BookAbout({ book }: { book: PublicBook }) {
  const { t } = useTranslation('book', { keyPrefix: 'specs' });
  const paragraphs = (book.description ?? '').split(/\n+/).filter((line) => line.trim() !== '');
  if (paragraphs.length === 0 && book.highlights.length === 0) return null;

  return (
    <div className={styles.about}>
      {paragraphs.length > 0 && (
        <section aria-labelledby="about-title">
          <h2 id="about-title" className={styles.heading}>
            {t('about')}
          </h2>
          <div className={styles.description}>
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </section>
      )}
      {book.highlights.length > 0 && (
        <section aria-labelledby="highlights-title" className={styles.highlights}>
          <h2 id="highlights-title" className={styles.heading}>
            {t('highlights')}
          </h2>
          <ul>
            {book.highlights.map((item) => (
              <li key={item}>
                <Icon name="check" size={18} />
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
