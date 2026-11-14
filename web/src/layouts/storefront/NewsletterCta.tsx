import { useId, useState } from 'react';

import { cx } from '@/shared/lib/cx';
import { AiTag } from '@/shared/ui/AiTag/AiTag';
import { buttonClass } from '@/shared/ui/Button/buttonClass';
import { useTranslation } from 'react-i18next';
import styles from './SiteFooter.module.css';

/**
 * «نشرة أفندي الذكية» card overlapping the footer (spec §4.7).
 * The API has no newsletter endpoint yet, so submitting says so honestly
 * instead of pretending the address was saved.
 */
export function NewsletterCta() {
  const { t } = useTranslation(undefined, { keyPrefix: 'newsletter' });
  const [submitted, setSubmitted] = useState(false);
  const inputId = useId();

  return (
   <section className={styles.cta} aria-labelledby={`${inputId}-title`}>
        <div>
          <AiTag tone="dark">{t('tag')}</AiTag>
          <h2 id={`${inputId}-title`} className={styles.ctaTitle}>
            {t('titleLine1')}
            <br />
            {t('titleLine2')}
          </h2>
          <p className={styles.ctaLead}>{t('lead')}</p>
        </div>
      <div>
        <form
          className={styles.ctaForm}
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(true);
          }}
        >
         <label htmlFor={inputId} className="sr-only">
            {t('email')}
          </label>
          <input
            id={inputId}
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder={t('email')}
            className={styles.ctaInput}
          />
          <button type="submit" className={buttonClass('red', 'md', styles.ctaSubmit)}>
            {t('subscribe')}
          </button>
        </form>
        <p className={cx(styles.ctaNote)} role="status">
          {submitted ? t('soon') : t('note')}
        </p>
      </div>
    </section>
  );
}
