import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { readSavedLanguage, saveLanguage, suggestedLanguage } from '@/app/languagePreference';
import { directionOf, pathInLanguage, UI_LANGUAGE } from '@/app/locale';

import styles from './LanguageSuggestion.module.css';

/**
 * "Kitap Efendi is also available in English." for a first-time visitor
 * whose browser prefers another live language. Written in that language,
 * since they may not read this page's. Never redirects on its own; either
 * answer is remembered, so it asks once.
 */
export function LanguageSuggestion() {
  const { pathname, search, hash } = useLocation();
  const { i18n } = useTranslation();
  const [target, setTarget] = useState(() =>
    readSavedLanguage() ? null : suggestedLanguage(UI_LANGUAGE),
  );
  if (!target) return null;

  const t = i18n.getFixedT(target, 'common');

  return (
    <aside className={styles.bar} lang={target} dir={directionOf(target)}>
      <div className={`wrap ${styles.inner}`}>
        <p className={styles.text}>{t('suggestion.text')}</p>
        <div className={styles.actions}>
          <a
            href={`${pathInLanguage(target, pathname)}${search}${hash}`}
            hrefLang={target}
            className={styles.switch}
            onClick={() => {
              saveLanguage(target);
            }}
          >
            {t('suggestion.switch')}
          </a>
          <button
            type="button"
            className={styles.dismiss}
            onClick={() => {
              saveLanguage(UI_LANGUAGE);
              setTarget(null);
            }}
          >
            {t('suggestion.dismiss')}
          </button>
        </div>
      </div>
    </aside>
  );
}