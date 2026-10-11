import { useId, useState } from 'react';

import { cx } from '@/shared/lib/cx';
import { AiTag } from '@/shared/ui/AiTag/AiTag';
import { buttonClass } from '@/shared/ui/Button/buttonClass';

import styles from './SiteFooter.module.css';

/**
 * «نشرة أفندي الذكية» card overlapping the footer (spec §4.7).
 * The API has no newsletter endpoint yet, so submitting says so honestly
 * instead of pretending the address was saved.
 */
export function NewsletterCta() {
  const [submitted, setSubmitted] = useState(false);
  const inputId = useId();

  return (
    <section className={styles.cta} aria-labelledby={`${inputId}-title`}>
      <div>
        <AiTag tone="dark">نشرة أفندي الذكية</AiTag>
        <h2 id={`${inputId}-title`} className={styles.ctaTitle}>
          كل أسبوع: خمسة كتب
          <br />
          مختارة لك وحدك
        </h2>
        <p className={styles.ctaLead}>
          يتعلّم أفندي من قراءاتك ويرسل لك الإصدارات الجديدة من الرسالة ناشرون التي تهمّك فعلاً.
        </p>
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
            بريدك الإلكتروني
          </label>
          <input
            id={inputId}
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="بريدك الإلكتروني"
            className={styles.ctaInput}
          />
          <button type="submit" className={buttonClass('red', 'md', styles.ctaSubmit)}>
            اشترك
          </button>
        </form>
        <p className={cx(styles.ctaNote)} role="status">
          {submitted
            ? 'الاشتراك في النشرة يُفتح قريباً، شكراً لاهتمامك.'
            : 'بلا إزعاج. يمكنك إلغاء الاشتراك في أي وقت.'}
        </p>
      </div>
    </section>
  );
}
