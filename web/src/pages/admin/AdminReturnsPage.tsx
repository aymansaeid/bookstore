import { Link, useSearchParams } from 'react-router';

import { paths } from '@/app/paths';
import styles from '@/features/admin/components/admin.module.css';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { RETURN_FILTERS, returnFilterFrom } from '@/features/admin/returns/labels';
import { useAdminReturns } from '@/features/admin/returns/queries';
import { returnStatusInfo } from '@/shared/api/enums';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { arabicPlural, formatCount, formatDateTime, formatMoney } from '@/shared/lib/format';
import { usePageParam } from '@/shared/lib/usePageParam';
import { Button } from '@/shared/ui/Button/Button';
import { Pagination } from '@/shared/ui/Pagination/Pagination';
import { StatusBadge } from '@/shared/ui/StatusBadge/StatusBadge';

const returnsPhrase = (count: number) =>
  arabicPlural(count, {
    one: 'طلب إرجاع واحد',
    two: 'طلبا إرجاع',
    few: 'طلبات إرجاع',
    many: 'طلب إرجاع',
  });

/** Returns queue (API §10): oldest first, opens on the ones waiting for a decision. */
export default function AdminReturnsPage() {
  const [params, setParams] = useSearchParams();
  const { page, hrefFor } = usePageParam();
  const status = returnFilterFrom(params.get('status'));
  const returns = useAdminReturns(status, page);
  const data = returns.data;

  return (
    <>
      <AdminPageHeader
        title="الإرجاعات"
        meta={data ? <span>{returnsPhrase(data.totalCount)} · الأقدم أولاً</span> : undefined}
      />

      <div className={styles.toolbar}>
        <div className={styles.filters} role="group" aria-label="الحالة">
          {RETURN_FILTERS.map((filter) => (
            <button
              key={filter.label}
              type="button"
              className={cx(styles.filter, status === filter.status && styles.filterOn)}
              aria-pressed={status === filter.status}
              onClick={() => {
                setParams(filter.status === 'Requested' ? {} : { status: filter.status ?? 'all' });
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {returns.isError && !data ? (
        <div className={styles.empty} role="alert">
          <p>{errorMessage(returns.error)}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void returns.refetch();
            }}
          >
            أعد المحاولة
          </Button>
        </div>
      ) : !data ? (
        <div className={styles.skeleton} aria-busy="true" aria-label="جارٍ تحميل الإرجاعات" />
      ) : data.items.length === 0 ? (
        <div className={styles.empty}>
          <p>{status === 'Requested' ? 'لا إرجاعات بانتظار قرارك.' : 'لا إرجاعات بهذه الحالة.'}</p>
        </div>
      ) : (
        <>
          <div className={cx(styles.card, returns.isPlaceholderData && styles.stale)}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">الطلب</th>
                  <th scope="col">العميل</th>
                  <th scope="col">الحالة</th>
                  <th scope="col">النسخ</th>
                  <th scope="col">المبلغ</th>
                  <th scope="col">طُلب في</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => {
                  const info = returnStatusInfo(item.status);
                  return (
                    <tr key={item.id}>
                      <td data-label="الطلب">
                        <Link to={paths.admin.return(item.id)} className={styles.rowLink} dir="ltr">
                          {item.orderNumber}
                        </Link>
                      </td>
                      <td data-label="العميل" dir="ltr">
                        {item.customerEmail}
                      </td>
                      <td data-label="الحالة">
                        <StatusBadge label={info.label} tone={info.tone} />
                      </td>
                      <td data-label="النسخ" className={styles.num}>
                        {formatCount(item.itemCount)}
                        <span className={styles.sub}>{item.isFullReturn ? 'كامل' : 'جزئي'}</span>
                      </td>
                      <td data-label="المبلغ" className={styles.num}>
                        {formatMoney(item.refundAmount, item.currency)}
                      </td>
                      <td data-label="طُلب في" className={styles.num}>
                        {formatDateTime(item.requestedAtUtc)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} hrefFor={hrefFor} />
        </>
      )}
    </>
  );
}
