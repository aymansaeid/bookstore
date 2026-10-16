import type { PublicBook } from '@/features/catalog/types';
import { formatLabel } from '@/shared/api/enums';
import { formatCount, volumesLabel } from '@/shared/lib/format';
import { Icon } from '@/shared/ui/Icon/Icon';

import styles from './BookDetails.module.css';

const LANGUAGES: Readonly<Record<string, string>> = {
  ar: 'العربية',
  tr: 'التركية',
  en: 'الإنجليزية',
};

export function BookSpecs({ book }: { book: PublicBook }) {
  const cells = [
    { label: 'الناشر', value: book.publisher ?? '—' },
    {
      label: 'التحقيق',
      value: book.muhaqqiqs.length > 0 ? book.muhaqqiqs.map((m) => m.name).join('، ') : '—',
    },
    { label: 'المجلدات', value: volumesLabel(book.volumes ?? 1) },
    { label: 'التجليد', value: formatLabel(book.format) },
    { label: 'عدد الصفحات', value: formatCount(book.pageCount) },
    { label: 'اللغة', value: LANGUAGES[book.language] ?? book.language },
    { label: 'ردمك', value: book.isbn ?? '—', ltr: true },
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
  const paragraphs = (book.description ?? '').split(/\n+/).filter((line) => line.trim() !== '');
  if (paragraphs.length === 0 && book.highlights.length === 0) return null;

  return (
    <div className={styles.about}>
      {paragraphs.length > 0 && (
        <section aria-labelledby="about-title">
          <h2 id="about-title" className={styles.heading}>
            عن الكتاب
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
            أبرز موضوعات الكتاب
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
