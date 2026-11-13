import { useState } from 'react';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import styles from '@/features/admin/components/admin.module.css';
import { TRANSACTION_LABELS } from '@/features/loyalty/api';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { formatCount, formatDateTime } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';

import { signedPoints } from '../labels';
import { usePointsHistory } from '../queries';

import local from './PointsHistory.module.css';

/** Newest first, 10 at a time. Paged in place so the profile doesn't jump to the top. */
export function PointsHistory({ customerId }: { customerId: number }) {
  const [page, setPage] = useState(1);
  const history = usePointsHistory(customerId, page);
  const data = history.data;

  if (history.isError && !data) {
    return (
      <p className={styles.muted} role="alert">
        {errorMessage(history.error)}
      </p>
    );
  }
  if (!data) return <div className={styles.skeleton} aria-busy="true" aria-label="جارٍ التحميل" />;
  if (data.items.length === 0) return <p className={styles.muted}>لا حركات نقاط بعد.</p>;

  return (
    <>
      <table className={cx(styles.table, history.isPlaceholderData && styles.stale)}>
        <thead>
          <tr>
            <th scope="col">الحركة</th>
            <th scope="col">النقاط</th>
            <th scope="col">التاريخ</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((entry) => (
            <tr key={entry.id}>
              <td data-label="الحركة">
                <span>
                  {TRANSACTION_LABELS[entry.type]}
                  {entry.orderNumber && (
                    <>
                      {' '}
                      <Link
                        to={`${paths.admin.orders}?search=${encodeURIComponent(entry.orderNumber)}`}
                        className={styles.rowLink}
                        dir="ltr"
                      >
                        {entry.orderNumber}
                      </Link>
                    </>
                  )}
                  {entry.note && <span className={styles.sub}>{entry.note}</span>}
                </span>
              </td>
              <td
                data-label="النقاط"
                className={cx(styles.num, local.points, entry.points < 0 && local.minus)}
              >
                <bdi>{signedPoints(entry.points)}</bdi>
              </td>
              <td data-label="التاريخ" className={styles.num}>
                {formatDateTime(entry.createdAtUtc)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.totalPages > 1 && (
        <div className={local.pager}>
          <Button
            variant="ghost"
            size="sm"
            disabled={!data.hasPreviousPage}
            onClick={() => {
              setPage((value) => value - 1);
            }}
          >
            الأحدث
          </Button>
          <span className={styles.muted}>
            صفحة {formatCount(data.page)} من {formatCount(data.totalPages)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={!data.hasNextPage}
            onClick={() => {
              setPage((value) => value + 1);
            }}
          >
            الأقدم
          </Button>
        </div>
      )}
    </>
  );
}