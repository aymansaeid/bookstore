import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { saveLanguage } from '@/app/languagePreference';
import {
  directionOf,
  ENABLED_LANGUAGES,
  LANGUAGE_NAMES,
  pathInLanguage,
  UI_LANGUAGE,
  type UiLanguage,
} from '@/app/locale';
import { cx } from '@/shared/lib/cx';

import styles from './LanguageSwitcher.module.css';

/** Short code on the header button: «ع» reads better than "AR" for Arabic. */
const SHORT: Readonly<Record<UiLanguage, string>> = { ar: 'ع', en: 'EN', tr: 'TR' };

/**
 * The same page in each live language. Plain <a> links, not router links:
 * the language is fixed per page load, so switching reloads at the new URL.
 * The choice is remembered, so an Arabic link from an email later opens in it.
 */
function LanguageLinks({ className }: { className?: string }) {
  const { pathname, search, hash } = useLocation();
  const { t } = useTranslation();

  return (
    <ul className={cx(styles.list, className)}>
      {ENABLED_LANGUAGES.map((language) => {
        const current = language === UI_LANGUAGE;
        return (
          <li key={language}>
            <a
              href={`${pathInLanguage(language, pathname)}${search}${hash}`}
              hrefLang={language}
              lang={language}
              dir={directionOf(language)}
              className={cx(styles.link, current && styles.current)}
              aria-current={current ? 'true' : undefined}
              onClick={() => {
                saveLanguage(language);
              }}
            >
              {LANGUAGE_NAMES[language]}
              {current && <span className="sr-only"> ({t('language.current')})</span>}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Header: a small «ع ▾» menu. Footer and phone menu: the languages in a row.
 * Renders nothing while Arabic is the only live language.
 */
export function LanguageSwitcher({
  variant,
  className,
}: {
  variant: 'menu' | 'inline';
  className?: string;
}) {
  const { t } = useTranslation();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  // A click outside or Esc closes the header menu.
  useEffect(() => {
    if (variant !== 'menu') return;
    const close = (event: Event) => {
      const details = detailsRef.current;
      if (!details?.open) return;
      if (
        event instanceof KeyboardEvent
          ? event.key === 'Escape'
          : !details.contains(event.target as Node)
      ) {
        details.open = false;
      }
    };
    document.addEventListener('click', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', close);
    };
  }, [variant]);

  if (ENABLED_LANGUAGES.length < 2) return null;

  if (variant === 'inline') {
    return (
      <nav className={cx(styles.inline, className)} aria-label={t('language.label')}>
        <LanguageLinks />
      </nav>
    );
  }

  return (
    <details ref={detailsRef} className={cx(styles.menu, className)}>
      <summary className={styles.summary} aria-label={t('language.label')}>
        <span aria-hidden="true">{SHORT[UI_LANGUAGE]}</span>
        <span className={styles.caret} aria-hidden="true">
          ▾
        </span>
      </summary>
      <LanguageLinks className={styles.popover} />
    </details>
  );
}