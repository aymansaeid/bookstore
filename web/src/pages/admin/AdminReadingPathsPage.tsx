import { Link } from 'react-router';

import { paths } from '@/app/paths';
import styles from '@/features/admin/components/admin.module.css';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { useAdminPaths } from '@/features/admin/paths/queries';
import { durationPhrase } from '@/features/paths/format';
import { levelLabel } from '@/shared/api/enums';
import { errorMessage } from '@/shared/api/errorMessages';
import { arabicPlural, formatCount } from '@/shared/lib/format';
import { Button, ButtonLink } from '@/shared/ui/Button/Button';
import { StatusBadge } from '@/shared/ui/StatusBadge/StatusBadge';

import local from './AdminCatalogPage.module.css';

const pathsPhrase = (count: number) =>
  arabicPlural(count, { one: 'مسار واحد', two: 'مساران', few: 'مسارات', many: 'مساراً' });

/** Reading paths (API §7d): every path, hidden ones too. */
export default function AdminReadingPathsPage() {
  const list = useAdminPaths();
  const rows = [...(list.data ?? [])].sort(
    (a, b) => a.displayOrder - b.displayOrder || a.title.localeCompare(b.title, 'ar'),
  );

  return (
    <>
      <AdminPageHeader
        title="مسارات القراءة"
        meta={list.data ? <span>{pathsPhrase(list.data.length)}</span> : undefined}
        actions={
          <ButtonLink to={paths.admin.newReadingPath} variant="ink" size="sm">
            + مسار جديد
          </ButtonLink>
        }
      />

      {list.isError && !list.data ? (
        <div className={styles.empty} role="alert">
          <p>{errorMessage(list.error)}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void list.refetch();
            }}
          >
            أعد المحاولة
          </Button>
        </div>
      ) : !list.data ? (
        <div className={styles.skeleton} aria-busy="true" aria-label="جارٍ تحميل المسارات" />
      ) : rows.length === 0 ? (
        <div className={styles.empty}>
          <p>لا مسارات بعد. أنشئ أول مسار من كتب المتجر.</p>
        </div>
      ) : (
        <div className={styles.card}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">المسار</th>
                <th scope="col">الكتب</th>
                <th scope="col">الخصم</th>
                <th scope="col">القرّاء</th>
                <th scope="col">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((path) => (
                <tr key={path.id}>
                  <td data-label="المسار">
                    <span className={local.nameText}>
                      <Link to={paths.admin.readingPath(path.id)} className={styles.rowLink}>
                        {path.title}
                      </Link>
                      <span className={styles.sub}>
                        {levelLabel(path.level)} · {durationPhrase(path.estimatedWeeks)}
                      </span>
                    </span>
                  </td>
                  <td data-label="الكتب" className={styles.num}>
                    {formatCount(path.stages.length)}
                  </td>
                  <td data-label="الخصم" className={styles.num}>
                    {formatCount(path.discountPercentage)}٪
                  </td>
                  <td data-label="القرّاء" className={styles.num}>
                    {formatCount(path.enrollmentCount)}
                  </td>
                  <td data-label="الحالة">
                    <span className={local.badges}>
                      {path.isFeatured && <StatusBadge label="مميّز" tone="gold" />}
                      <StatusBadge
                        label={path.isActive ? 'ظاهر' : 'مخفي'}
                        tone={path.isActive ? 'green' : 'gray'}
                      />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}