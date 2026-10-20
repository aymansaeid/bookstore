import { useState } from 'react';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import type { Dashboard } from '@/features/admin/api';
import { RevenueChart } from '@/features/admin/components/RevenueChart';
import { Sparkline } from '@/features/admin/components/Sparkline';
import { useDashboard } from '@/features/admin/queries';
import { orderStatusInfo } from '@/shared/api/enums';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { countryName, formatCount, formatMoney, formatPlainDate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';
import { StatusBadge } from '@/shared/ui/StatusBadge/StatusBadge';

import styles from './AdminDashboardPage.module.css';

const RANGES = [
  { days: 7, label: '٧ أيام' },
  { days: 30, label: '٣٠ يوماً' },
  { days: 90, label: '٩٠ يوماً' },
  { days: 365, label: 'سنة' },
] as const;

const percent = new Intl.NumberFormat('ar-EG', { style: 'percent', maximumFractionDigits: 0 });

/** Change against the same-length period just before; null when it can't be said. */
function Delta({ now, before }: { now: number; before: number | undefined }) {
  if (before === undefined) return null;
  if (before === 0) {
    return now === 0 ? null : (
      <span className={styles.deltaNeutral}>جديد مقارنة بالفترة السابقة</span>
    );
  }
  const change = (now - before) / before;
  if (Math.abs(change) < 0.005) return <span className={styles.deltaNeutral}>دون تغيير</span>;
  const up = change > 0;
  return (
    <span className={up ? styles.deltaUp : styles.deltaDown}>
      <span aria-hidden="true">{up ? '▲' : '▼'}</span> {percent.format(Math.abs(change))}
      <span className="sr-only">{up ? ' زيادة' : ' انخفاض'}</span> عن الفترة السابقة
    </span>
  );
}

function Kpis({ data, previous }: { data: Dashboard; previous: Dashboard | undefined }) {
  const revenues = data.dailyRevenue.map((day) => day.revenue);
  const orders = data.dailyRevenue.map((day) => day.orders);
  return (
    <ul className={styles.kpis}>
      <li className={styles.kpi}>
        <p className={styles.kpiLabel}>المبيعات</p>
        <p className={styles.kpiValue}>{formatMoney(data.revenue, data.currency)}</p>
        <Delta now={data.revenue} before={previous?.revenue} />
        <Sparkline values={revenues} />
      </li>
      <li className={styles.kpi}>
        <p className={styles.kpiLabel}>الطلبات المدفوعة</p>
        <p className={styles.kpiValue}>{formatCount(data.paidOrders)}</p>
        <Delta now={data.paidOrders} before={previous?.paidOrders} />
        <Sparkline values={orders} />
      </li>
      <li className={styles.kpi}>
        <p className={styles.kpiLabel}>متوسط السلة</p>
        <p className={styles.kpiValue}>{formatMoney(data.averageOrderValue, data.currency)}</p>
        <Delta now={data.averageOrderValue} before={previous?.averageOrderValue} />
      </li>
      <li className={styles.kpi}>
        <p className={styles.kpiLabel}>النسخ المبيعة</p>
        <p className={styles.kpiValue}>{formatCount(data.unitsSold)}</p>
        <Delta now={data.unitsSold} before={previous?.unitsSold} />
      </li>
      <li className={cx(styles.kpi, styles.kpiDark)}>
        <p className={styles.kpiLabel}>بانتظار الشحن الآن</p>
        <p className={styles.kpiValue}>{formatCount(data.ordersAwaitingShipment)}</p>
        <Link to={`${paths.admin.orders}?status=Paid`} className={styles.kpiLink}>
          جهّزها للشحن <span aria-hidden="true">←</span>
        </Link>
      </li>
    </ul>
  );
}

/** Spec 5.10 dashboard, with what the API has today (§10): no AI cards yet (§13). */
export default function AdminDashboardPage() {
  const [days, setDays] = useState<number>(30);
  const dashboard = useDashboard(days);
  const previous = useDashboard(days, 'previous');
  const data = dashboard.data;
  const maxCountry = Math.max(...(data?.topCountries.map((country) => country.revenue) ?? [0]), 1);
  const statuses = Object.entries(data?.ordersByStatus ?? {}).filter(([, count]) => count > 0);

  return (
    <>
      <DocumentTitle title="لوحة المعلومات" />
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>لوحة المعلومات</h1>
          {data && (
            <p className={styles.range}>
              من {formatPlainDate(data.from)} إلى {formatPlainDate(data.to)} · بتوقيت إسطنبول
            </p>
          )}
        </div>
        <div className={styles.presets} role="group" aria-label="الفترة">
          {RANGES.map((range) => (
            <button
              key={range.days}
              type="button"
              className={cx(styles.preset, days === range.days && styles.presetOn)}
              aria-pressed={days === range.days}
              onClick={() => {
                setDays(range.days);
              }}
            >
              {range.label}
            </button>
          ))}
        </div>
      </header>

      {dashboard.isError && !data ? (
        <div className={styles.error} role="alert">
          <p>{errorMessage(dashboard.error)}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void dashboard.refetch();
            }}
          >
            أعد المحاولة
          </Button>
        </div>
      ) : !data ? (
        <div className={styles.skeleton} aria-busy="true" aria-label="جارٍ تحميل اللوحة" />
      ) : (
        <div className={cx(styles.body, dashboard.isFetching && styles.stale)}>
          <Kpis data={data} previous={previous.data} />

          <div className={styles.row}>
            <section className={cx(styles.card, styles.revenue)} aria-labelledby="revenue-title">
              <h2 id="revenue-title" className={styles.cardTitle}>
                الإيرادات اليومية
              </h2>
              <RevenueChart data={data} />
            </section>

            <section className={styles.card} aria-labelledby="status-title">
              <h2 id="status-title" className={styles.cardTitle}>
                الطلبات حسب الحالة
              </h2>
              <p className={styles.muted}>كل الطلبات حتى الآن، لا الفترة المختارة فقط.</p>
              {statuses.length === 0 ? (
                <p className={styles.muted}>لا طلبات بعد.</p>
              ) : (
                <ul className={styles.statuses}>
                  {statuses.map(([status, count]) => {
                    const info = orderStatusInfo(status);
                    return (
                      <li key={status}>
                        <Link
                          to={`${paths.admin.orders}?status=${status}`}
                          className={styles.status}
                        >
                          <StatusBadge label={info.label} tone={info.tone} />
                          <b>{formatCount(count)}</b>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          <div className={styles.row}>
            <section className={styles.card} aria-labelledby="countries-title">
              <h2 id="countries-title" className={styles.cardTitle}>
                المبيعات حسب البلد
              </h2>
              {data.topCountries.length === 0 ? (
                <p className={styles.muted}>لا مبيعات في هذه الفترة.</p>
              ) : (
                <ul className={styles.countries}>
                  {data.topCountries.map((country) => (
                    <li key={country.countryCode} className={styles.country}>
                      <span className={styles.countryName}>{countryName(country.countryCode)}</span>
                      <span className={styles.bar} aria-hidden="true">
                        <span
                          style={{ inlineSize: `${String((country.revenue / maxCountry) * 100)}%` }}
                        />
                      </span>
                      <span className={styles.countryValue}>
                        {formatMoney(country.revenue, data.currency)}
                        <small> · {formatCount(country.orders)} طلب</small>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={styles.card} aria-labelledby="stock-title">
              <div className={styles.cardHead}>
                <h2 id="stock-title" className={styles.cardTitle}>
                  مخزون منخفض
                </h2>
                <Link to={paths.admin.inventory} className={styles.more}>
                  المخزون <span aria-hidden="true">←</span>
                </Link>
              </div>
              {data.lowStock.length === 0 ? (
                <p className={styles.muted}>كل الكتب فوق حدّ التنبيه.</p>
              ) : (
                <ul className={styles.stock}>
                  {data.lowStock.map((book) => (
                    <li key={book.bookId}>
                      <Link to={paths.admin.book(book.bookId)} className={styles.stockTitle}>
                        {book.title}
                      </Link>
                      <span className={book.availableToSell === 0 ? styles.out : styles.low}>
                        {book.availableToSell === 0
                          ? 'نفد'
                          : `${formatCount(book.availableToSell)} متاح`}
                        <small> / حدّ التنبيه {formatCount(book.lowStockThreshold)}</small>
                      </span>
                      {book.waitingListCount > 0 && (
                        <span className={styles.waiting}>
                          {formatCount(book.waitingListCount)} بانتظار التوفر
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  );
}
