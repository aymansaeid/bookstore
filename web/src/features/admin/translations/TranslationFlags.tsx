import { TRANSLATION_LANGUAGES, type TranslationFlags as Flags } from './api';
import styles from './TranslationFlags.module.css';

/** «EN ✓ TR —» in admin lists: which languages an item has. */
export function TranslationFlags({ translations }: { translations: Flags | undefined }) {
  const have = translations ?? [];
  return (
    <span className={styles.flags}>
      {TRANSLATION_LANGUAGES.map((item) => {
        const done = have.includes(item.code);
        return (
          <span
            key={item.code}
            className={done ? styles.done : styles.todo}
            title={`${item.label}: ${done ? 'مترجمة' : 'ناقصة'}`}
          >
            <span aria-hidden="true">
              {item.code.toUpperCase()} {done ? '✓' : '—'}
            </span>
            <span className="sr-only">
              {item.label}: {done ? 'مترجمة' : 'ناقصة'}
            </span>
          </span>
        );
      })}
    </span>
  );
}