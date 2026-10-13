import { useStoreStats } from '@/features/store/queries';
import { cx } from '@/shared/lib/cx';
import { formatAmount, formatCount } from '@/shared/lib/format';
import { AiTag } from '@/shared/ui/AiTag/AiTag';
import { EffendiAvatar } from '@/shared/ui/EffendiAvatar/EffendiAvatar';

import styles from './EffendiPanel.module.css';

const SAMPLE_INTERESTS = ['الحديث وعلومه', 'السيرة النبوية', 'التفسير', 'العقيدة', 'اللغة العربية'];

/** Spec 5.8 ink side. Figures are live from /api/store/stats; the chat is an illustration. */
export function EffendiPanel({ className }: { className?: string }) {
  const { data: stats } = useStoreStats();

  const figures = stats
    ? [
        stats.bookCount > 0 && { value: formatCount(stats.bookCount), label: 'عنوان' },
        stats.muhaqqiqCount > 0 && { value: formatCount(stats.muhaqqiqCount), label: 'محقّق' },
        stats.averageRating !== null && {
          value: `${formatAmount(stats.averageRating)}★`,
          label: 'تقييم القرّاء',
        },
        stats.countriesShippedTo > 0 && {
          value: formatCount(stats.countriesShippedTo),
          label: 'دولة وصلتها كتبنا',
        },
      ].filter((item) => item !== false)
    : [];

  return (
    <aside className={cx(styles.panel, className)} aria-label="عن أفندي الذكي">
      <div className={styles.intro}>
        <EffendiAvatar size={96} online />
        <div className={styles.introText}>
          <AiTag tone="dark">أفندي الذكي</AiTag>
          <small>مساعدك الشخصي في عالم الكتب</small>
        </div>
      </div>

      <h2 className={styles.title}>
        مكتبة تعرفك،
        <em>وأفندي يتذكّر ما تحب</em>
      </h2>
      <p className={styles.lead}>
        كلما قرأت أكثر، صارت اقتراحات أفندي أدقّ: إصدارات محققيك المفضّلين، ومسارات تناسب وقتك،
        وتنبيهات حين يعود كتاب نفد من المخزون.
      </p>

      <div className={styles.chat}>
        <p>
          أهلاً بك 👋 أخبرني بما تحب قراءته، وسأرتّب لك المكتبة على مقاسك. اختر اهتماماتك عند إنشاء
          الحساب:
        </p>
        <ul className={styles.tags}>
          {SAMPLE_INTERESTS.map((name) => (
            <li key={name} className={styles.tag}>
              {name}
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
