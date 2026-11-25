import { useTranslation } from 'react-i18next';

import { useStoreStats } from '@/features/store/queries';
import { cx } from '@/shared/lib/cx';
import { formatAmount, formatCount } from '@/shared/lib/format';
import { AiTag } from '@/shared/ui/AiTag/AiTag';
import { EffendiAvatar } from '@/shared/ui/EffendiAvatar/EffendiAvatar';

import styles from './EffendiPanel.module.css';

const SAMPLE_INTERESTS = ['interest1', 'interest2', 'interest3', 'interest4', 'interest5'] as const;

/** Spec 5.8 ink side. Figures are live from /api/store/stats; the chat is an illustration. */
export function EffendiPanel({ className }: { className?: string }) {
  const { t } = useTranslation('auth', { keyPrefix: 'panel' });
  const { data: stats } = useStoreStats();

  const figures = stats
    ? [
        stats.bookCount > 0 && { value: formatCount(stats.bookCount), label: t('books') },
        stats.muhaqqiqCount > 0 && {
          value: formatCount(stats.muhaqqiqCount),
          label: t('muhaqqiqs'),
        },
        stats.averageRating !== null && {
          value: `${formatAmount(stats.averageRating)}★`,
          label: t('rating'),
        },
        stats.countriesShippedTo > 0 && {
          value: formatCount(stats.countriesShippedTo),
          label: t('countries'),
        },
      ].filter((item) => item !== false)
    : [];

  return (
    <aside className={cx(styles.panel, className)} aria-label={t('label')}>
      <div className={styles.intro}>
        <EffendiAvatar size={96} online />
        <div className={styles.introText}>
          <AiTag tone="dark">{t('name')}</AiTag>
          <small>{t('tagline')}</small>
        </div>
      </div>

      <h2 className={styles.title}>
        {t('title')}
        <em>{t('titleEm')}</em>
      </h2>
      <p className={styles.lead}>{t('lead')}</p>

      <div className={styles.chat}>
        <p>{t('chat')}</p>
        <ul className={styles.tags}>
          {SAMPLE_INTERESTS.map((key) => (
            <li key={key} className={styles.tag}>
              {t(key)}
            </li>
          ))}
        </ul>
      </div>

      {figures.length > 0 && (
        <dl className={styles.stats}>
          {figures.map((figure) => (
            <div key={figure.label} className={styles.stat}>
              <dt>{figure.label}</dt>
              <dd>{figure.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </aside>
  );
}