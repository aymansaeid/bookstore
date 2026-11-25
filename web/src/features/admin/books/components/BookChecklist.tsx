import { formatCount } from '@/shared/lib/format';

import type { AdminBook } from '../api';
import type { TranslationLanguage } from '../translations';

import styles from './BookChecklist.module.css';

interface Item {
  label: string;
  done: boolean;
  /** Section id on the editor page. */
  section: string;
  language?: TranslationLanguage;
}

function itemsOf(book: AdminBook): Item[] {
  return [
    { label: 'صورة الغلاف', done: book.images.length > 0, section: 'images' },
    { label: 'الوصف', done: book.description.trim() !== '', section: 'details' },
    { label: 'القسم', done: book.categoryId !== null, section: 'taxonomy' },
    { label: 'المحقق', done: book.muhaqqiqIds.length > 0, section: 'taxonomy' },
    { label: 'المخزون', done: book.stockQuantity > 0, section: 'stock' },
    {
      label: 'الترجمة الإنجليزية',
      done: book.translations.includes('en'),
      section: 'translations',
      language: 'en',
    },
    {
      label: 'الترجمة التركية',
      done: book.translations.includes('tr'),
      section: 'translations',
      language: 'tr',
    },
    { label: 'ظاهر في المتجر', done: book.isActive, section: 'stock' },
  ];
}

/**
 * What the book still needs, each a jump to its section. The first thing on
 * the page, so a new book is finished from top to bottom without hunting.
 */
export function BookChecklist({
  book,
  onOpenTranslation,
}: {
  book: AdminBook;
  onOpenTranslation: (language: TranslationLanguage) => void;
}) {
  const items = itemsOf(book);
  const done = items.filter((item) => item.done).length;
  const percent = Math.round((done / items.length) * 100);

  return (
    <div className={styles.root}>
      <p className={styles.summary}>
        <b>
          {done === items.length
            ? 'الكتاب مكتمل'
            : `${formatCount(done)} من ${formatCount(items.length)} جاهزة`}
        </b>
        <span
          className={styles.meter}
          role="progressbar"
          aria-label="اكتمال الكتاب"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <span style={{ inlineSize: `${String(percent)}%` }} />
        </span>
      </p>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.label}>
            <a
              href={`#${item.section}`}
              className={item.done ? styles.done : styles.todo}
              onClick={() => {
                if (item.language) onOpenTranslation(item.language);
              }}
            >
              <span className={styles.mark} aria-hidden="true">
                {item.done ? '✓' : '○'}
              </span>
              {item.label}
              <span className="sr-only">{item.done ? ' (جاهز)' : ' (ناقص)'}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}