import { DEFAULT_LANGUAGE, UI_LANGUAGE } from '@/app/locale';
import { cx } from '@/shared/lib/cx';

import styles from './OriginalTitle.module.css';

/**
 * The Arabic title under a translated one (API guide §2b): «زاد المعاد» under
 * "Zad al-Ma'ad". Nothing on Arabic pages, and nothing while the book has no
 * translation yet (the title is then the Arabic one already).
 */
export function OriginalTitle({
  title,
  original,
  className,
}: {
  title: string;
  original: string | null | undefined;
  className?: string;
}) {
  if (UI_LANGUAGE === DEFAULT_LANGUAGE || !original || original.trim() === title.trim()) {
    return null;
  }
  return (
    <span className={cx(styles.original, className)} lang="ar" dir="rtl">
      {original}
    </span>
  );
}