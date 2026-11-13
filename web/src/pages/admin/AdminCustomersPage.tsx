import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { paths } from '@/app/paths';
import styles from '@/features/admin/components/admin.module.css';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import type { CustomerSort, CustomerStatus } from '@/features/admin/customers/api';
import {
  accountState,
  CUSTOMER_FILTERS,
  CUSTOMER_SORTS,
  customersPhrase,
  isCustomerSort,
  isCustomerStatus,
} from '@/features/admin/customers/labels';
import { useAdminCustomers, useCustomerOverview } from '@/features/admin/customers/queries';
import { tierLabel } from '@/shared/api/enums';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { formatCount, formatDate, formatMoney } from '@/shared/lib/format';
import { usePageParam } from '@/shared/lib/usePageParam';
import { Button } from '@/shared/ui/Button/Button';
import { Pagination } from '@/shared/ui/Pagination/Pagination';
import { StatusBadge } from '@/shared/ui/StatusBadge/StatusBadge';

import local from './AdminCustomersPage.module.css';

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
      <label htmlFor="customer-search" className="sr-only">
        ابحث بالبريد أو الاسم أو الهاتف أو رقم العميل أو رقم الطلب
      </label>
      <input
        id="customer-search"
        type="search"
        dir="auto"
        maxLength={200}
        placeholder="البريد، الاسم، الهاتف، #رقم العميل أو رقم طلب"
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

/** Header cards (API §10b /stats). */
function Overview() {
  const overview = useCustomerOverview();
  const data = overview.data;
  if (!data) return null;

  const cards = [
    { label: 'كل العملاء', value: data.total },
    { label: 'جدد خلال ٣٠ يوماً', value: data.newLast30Days },
    { label: 'اشتروا مرة على الأقل', value: data.withOrders },
    { label: 'لم يفعّلوا البريد', value: data.unverified },
    { label: 'موقوفون', value: data.inactive },
  ];

  return (
    <ul className={local.cards} aria-label="ملخص العملاء">
      {cards.map((card) => (
        <li key={card.label} className={local.card}>
          <p className={local.cardLabel}>{card.label}</p>
          <p className={local.cardValue}>{formatCount(card.value)}</p>
        </li>
      ))}
    </ul>
  );
}

/** Customers (API §10b): search, status, sort; each row opens the profile. */
export default function AdminCustomersPage() {
  const [params, setParams] = useSearchParams();
  const { page, hrefFor } = usePageParam();
  const rawStatus = params.get('status');
  const status: CustomerStatus | null = isCustomerStatus(rawStatus) ? rawStatus : null;
  const rawSort = params.get('sort');
  const sort: CustomerSort = isCustomerSort(rawSort) ? rawSort : 'Newest';
  const search = params.get('search') ?? '';
  const customers = useAdminCustomers({ status, sort, search, page });
  const data = customers.data;

  // A new filter starts again from page 1.
  const update = (next: {
    status?: CustomerStatus | null;
    sort?: CustomerSort;
    search?: string;
  }) => {
    const merged = new URLSearchParams();
    const s = next.status === undefined ? status : next.status;
    const o = next.sort ?? sort;
    const q = next.search ?? search;
    if (s) merged.set('status', s);
    if (o !== 'Newest') merged.set('sort', o);
    if (q) merged.set('search', q);
    setParams(merged);
  };

  return (
    <>
      <AdminPageHeader
        title="العملاء"
        meta={data ? <span>{customersPhrase(data.totalCount)}</span> : undefined}
      />

      <Overview />

      <div className={styles.toolbar}>
        <div className={styles.filters} role="group" aria-label="الحالة">
          {CUSTOMER_FILTERS.map((filter) => (
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
      <div className={local.sortRow}>
        <label htmlFor="customer-sort">الترتيب</label>
        <select
          id="customer-sort"
          className={local.select}
          value={sort}
          onChange={(event) => {
            const value = event.target.value;
            if (isCustomerSort(value)) update({ sort: value });
          }}
        >
          {CUSTOMER_SORTS.map((option) => (
            <option key={option.sort} value={option.sort}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {customers.isError && !data ? (
        <div className={styles.empty} role="alert">
          <p>{errorMessage(customers.error)}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void customers.refetch();
            }}
          >
            أعد المحاولة
          </Button>
        </div>
      ) : !data ? (
        <div className={styles.skeleton} aria-busy="true" aria-label="جارٍ تحميل العملاء" />
      ) : data.items.length === 0 ? (
        <div className={styles.empty}>
          <p>{search ? `لا عملاء يطابقون «${search}».` : 'لا عملاء بهذه الحالة.'}</p>
          {search && (
            <p className={styles.muted}>
              إن كان صاحب طلب بلا حساب، فابحث عنه في{' '}
              <Link
                to={`${paths.admin.orders}?search=${encodeURIComponent(search)}`}
                className={styles.rowLink}
              >
                الطلبات
              </Link>
              .
            </p>
          )}
        </div>
      ) : (
        <>
          <div className={cx(styles.card, customers.isPlaceholderData && styles.stale)}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">العميل</th>
                  <th scope="col">الحالة</th>
                  <th scope="col">الطلبات</th>
                  <th scope="col">الإنفاق</th>
                  <th scope="col">النقاط</th>
                  <th scope="col">التسجيل</th>
                  <th scope="col">آخر دخول</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((customer) => {
                  const state = accountState(customer);
                  return (
                    <tr key={customer.id}>
                      <td data-label="العميل">
                        <span>
                          <Link to={paths.admin.customer(customer.id)} className={styles.rowLink}>
                            {customer.isAnonymized
                              ? `حساب محذوف رقم ${formatCount(customer.id)}`
                              : customer.fullName}
                          </Link>
                          {!customer.isAnonymized && (
                            <span className={styles.sub} dir="ltr">
                              {customer.email}
                            </span>
                          )}
                        </span>
                      </td>
                      <td data-label="الحالة">
                        <StatusBadge label={state.label} tone={state.tone} />
                      </td>
                      <td data-label="الطلبات" className={styles.num}>
                        {formatCount(customer.orderCount)}
                      </td>
                      <td data-label="الإنفاق" className={styles.num}>
                        {formatMoney(customer.totalSpent, customer.currency)}
                      </td>
                      <td data-label="النقاط" className={styles.num}>
                        <span>
                          {formatCount(customer.loyaltyPoints)}
                          <span className={styles.sub}>{tierLabel(customer.loyaltyTier)}</span>
                        </span>
                      </td>
                      <td data-label="التسجيل" className={styles.num}>
                        {formatDate(customer.createdAtUtc)}
                      </td>
                      <td data-label="آخر دخول" className={styles.num}>
                        {customer.lastLoginAtUtc ? formatDate(customer.lastLoginAtUtc) : '—'}
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