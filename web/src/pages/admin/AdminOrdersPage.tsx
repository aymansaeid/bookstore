import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { paths } from '@/app/paths';
import styles from '@/features/admin/components/admin.module.css';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { isOrderStatus, ORDER_FILTERS, ordersPhrase } from '@/features/admin/orders/labels';
import { useAdminOrders } from '@/features/admin/orders/queries';
import { type OrderStatus, orderStatusInfo } from '@/shared/api/enums';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { countryName, formatCount, formatDateTime, formatMoney } from '@/shared/lib/format';
import { usePageParam } from '@/shared/lib/usePageParam';
import { Button } from '@/shared/ui/Button/Button';
import { Pagination } from '@/shared/ui/Pagination/Pagination';
import { StatusBadge } from '@/shared/ui/StatusBadge/StatusBadge';

function SearchBox({ initial, onSearch }: { initial: string; onSearch: (value: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <form
      className={styles.search}
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(value.trim());
      }}
    >
      <label htmlFor="order-search" className="sr-only">
        ابحث برقم الطلب أو البريد
      </label>
      <input
        id="order-search"
        type="search"
        dir="auto"
        maxLength={320}
        placeholder="رقم الطلب أو البريد الإلكتروني"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
        }}
      />
      <Button type="submit" variant="ink" size="sm">
        بحث
      </Button>
    </form>
  );
}

/** Orders (API §10): newest first, by status, searchable by number or email. */
export default function AdminOrdersPage() {
  const [params, setParams] = useSearchParams();
  const { page, hrefFor } = usePageParam();
  const rawStatus = params.get('status');
  const status: OrderStatus | null = isOrderStatus(rawStatus) ? rawStatus : null;
  const search = params.get('search') ?? '';
  const orders = useAdminOrders({ status, search, page });
  const data = orders.data;

  // A new filter starts again from page 1.
  const update = (next: { status?: OrderStatus | null; search?: string }) => {
    const merged = new URLSearchParams();
    const s = next.status === undefined ? status : next.status;
    const q = next.search ?? search;
    if (s) merged.set('status', s);
    if (q) merged.set('search', q);
    setParams(merged);
  };

  return (
    <>
      <AdminPageHeader
        title="الطلبات"
        meta={data ? <span>{ordersPhrase(data.totalCount)}</span> : undefined}
      />

      <div className={styles.toolbar}>
        <div className={styles.filters} role="group" aria-label="الحالة">
          {ORDER_FILTERS.map((filter) => (
            <button
              key={filter.label}
              type="button"
              className={cx(styles.filter, status === filter.status && styles.filterOn)}
              aria-pressed={status === filter.status}
              onClick={() => {
                update({ status: filter.status });
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <SearchBox
          key={search}
          initial={search}
          onSearch={(value) => {
            update({ search: value });
          }}
        />
      </div>

      {orders.isError && !data ? (
        <div className={styles.empty} role="alert">
          <p>{errorMessage(orders.error)}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void orders.refetch();
            }}
          >
            أعد المحاولة
          </Button>
        </div>
      ) : !data ? (
        <div className={styles.skeleton} aria-busy="true" aria-label="جارٍ تحميل الطلبات" />
      ) : data.items.length === 0 ? (
        <div className={styles.empty}>
          <p>{search ? `لا طلبات تطابق «${search}».` : 'لا طلبات بهذه الحالة.'}</p>
        </div>
      ) : (
        <>
          <div className={cx(styles.card, orders.isPlaceholderData && styles.stale)}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">الطلب</th>
                  <th scope="col">العميل</th>
                  <th scope="col">الوجهة</th>
                  <th scope="col">الحالة</th>
                  <th scope="col">النسخ</th>
                  <th scope="col">الإجمالي</th>
                  <th scope="col">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((order) => {
                  const info = orderStatusInfo(order.status);
                  return (
                    <tr key={order.id}>
                      <td data-label="الطلب">
                        <Link to={paths.admin.order(order.id)} className={styles.rowLink} dir="ltr">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td data-label="العميل">
                        <span>
                          {order.recipientName}
                          <span className={styles.sub} dir="ltr">
                            {order.customerEmail}
                          </span>
                        </span>
                      </td>
                      <td data-label="الوجهة">{countryName(order.countryCode)}</td>
                      <td data-label="الحالة">
                        <StatusBadge
                          label={order.status === 'Paid' ? 'بانتظار الشحن' : info.label}
                          tone={info.tone}
                        />
                      </td>
                      <td data-label="النسخ" className={styles.num}>
                        {formatCount(order.itemCount)}
                      </td>
                      <td data-label="الإجمالي" className={styles.num}>
                        {formatMoney(order.total, order.currency)}
                      </td>
                      <td data-label="التاريخ" className={styles.num}>
                        {formatDateTime(order.createdAtUtc)}
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
