import { useId } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { searchUrl } from '@/app/navigation';
import { paths } from '@/app/paths';
import { cx } from '@/shared/lib/cx';
import { Icon } from '@/shared/ui/Icon/Icon';
import { Spark } from '@/shared/ui/Spark/Spark';

import styles from './HeaderSearch.module.css';

/**
 * Header search (spec §4.1). Submits to the catalog search (API §4d) until
 * Efendi's meaning search exists. Camera and mic open Ask Efendi, where the
 * photo and voice search will live (step 17).
 */
export function HeaderSearch({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const inputId = useId();
  // Mirror ?q= on the search page; `key` remounts the input when it changes.
  const currentQuery =
    pathname === paths.search ? (new URLSearchParams(search).get('q') ?? '') : '';

  return (
    <form
      role="search"
      className={cx(styles.form, className)}
      onSubmit={(event) => {
        event.preventDefault();
        const value = new FormData(event.currentTarget).get('q');
        const query = typeof value === 'string' ? value.trim() : '';
        void navigate(query ? searchUrl(query) : paths.search);
      }}
    >
      <Icon name="search" className={styles.searchIcon} />
      <label htmlFor={inputId} className="sr-only">
        ابحث في المكتبة
      </label>
      <input
        key={currentQuery}
        id={inputId}
        name="q"
        type="search"
        className={styles.input}
        defaultValue={currentQuery}
        placeholder="ابحث عن كتاب، محقق… أو اسأل أفندي بلغتك"
        autoComplete="off"
        enterKeyHint="search"
        maxLength={200}
      />
      <Link
        to={`${paths.askEfendi}?mode=photo`}
        className={styles.tool}
        aria-label="ابحث بصورة الغلاف"
      >
        <Icon name="cam" />
      </Link>
      <Link to={`${paths.askEfendi}?mode=voice`} className={styles.tool} aria-label="ابحث بصوتك">
        <Icon name="mic" />
      </Link>
      <button type="submit" className={styles.submit}>
        <Spark size={13} />
        <em className={styles.submitLabel}>بحث ذكي</em>
      </button>
    </form>
  );
}
