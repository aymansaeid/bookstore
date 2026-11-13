import { useState } from 'react';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import type { KpiCard, Kpis } from '@/features/admin/api';
import { RevenueChart } from '@/features/admin/components/RevenueChart';
import { Sparkline } from '@/features/admin/components/Sparkline';
import { useDashboard, useKpis } from '@/features/admin/queries';
import { orderStatusInfo } from '@/shared/api/enums';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { countryName, formatCount, formatMoney, formatPlainDate } from '@/shared/lib/format';
import { AiTag } from '@/shared/ui/AiTag/AiTag';
import { Button } from '@/shared/ui/Button/Button';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';
import { StatusBadge } from '@/shared/ui/StatusBadge/StatusBadge';

import styles from './AdminDashboardPage.module.css';

/** /kpis takes 7 to 90 days (API §10c); longer ranges live in the reports. */
const RANGES = [
  { days: 7, label: '٧ أيام' },
  { days: 30, label: '٣٠ يوماً' },
  { days: 90, label: '٩٠ يوماً' },
] as const;

const percent = new Intl.NumberFormat('ar-EG', { style: 'percent', maximumFractionDigits: 1 });
const asPercent = (value: number) => percent.format(value / 100);

/**
 * Change against the same-length period just before (API §10c). No arrow when
 * the server can't say (previous was 0). `lowerIsBetter` turns a rise red.
 */
function Delta({ card, lowerIsBetter = false }: { card: KpiCard; lowerIsBetter?: boolean }) {
  const change = card.changePercent;
  if (change === null) {
    return card.value === 0 ? null : (
      <span className={styles.deltaNeutral}>جديد مقارنة بالفترة السابقة</span>
    );
  }
  if (Math.abs(change) < 0.5) return <span className={styles.deltaNeutral}>دون تغيير</span>;
  const up = change > 0;
  return (
    <span className={up !== lowerIsBetter ? styles.deltaUp : styles.deltaDown}>
      <span aria-hidden="true">{up ? '▲' : '▼'}</span> {asPercent(Math.abs(change))}
      <span className="sr-only">{up ? ' زيادة' : ' انخفاض'}</span> عن الفترة السابقة
    </span>
  );
}

const values = (card: KpiCard) => card.series.map((point) => point.value);

function Kpis({ kpis, awaitingShipment }: { kpis: Kpis; awaitingShipment: number | undefined }) {
  const today = kpis.revenue.series.at(-1)?.value ?? 0;
  return (
    <ul className={styles.kpis}>
      <li className={styles.kpi}>
        <p className={styles.kpiLabel}>المبيعات</p>
        <p className={styles.kpiValue}>{formatMoney(kpis.revenue.value, kpis.currency)}</p>
        <p className={styles.kpiSub}>اليوم: {formatMoney(today, kpis.currency)}</p>
        <Delta card={kpis.revenue} />
        <Sparkline values={values(kpis.revenue)} />
      </li>
      <li className={styles.kpi}>
        <p className={styles.kpiLabel}>الطلبات</p>
        <p className={styles.kpiValue}>{formatCount(kpis.orders.value)}</p>
        <Delta card={kpis.orders} />
        <Sparkline values={values(kpis.orders)} />
      </li>
      <li className={styles.kpi}>
        <p className={styles.kpiLabel}>متوسط السلة</p>
        <p className={styles.kpiValue}>
          {formatMoney(kpis.averageOrderValue.value, kpis.currency)}
        </p>
        <Delta card={kpis.averageOrderValue} />
        <Sparkline values={values(kpis.averageOrderValue)} />
      </li>
      <li className={styles.kpi}>
        <p className={styles.kpiLabel}>معدّل الإرجاع</p>
        <p className={styles.kpiValue}>{asPercent(kpis.returnRate.value)}</p>
        {kpis.refundedAmount > 0 && (
          <p className={styles.kpiSub}>
            استُرد {formatMoney(kpis.refundedAmount, kpis.currency)} في الفترة
          </p>
        )}
        <Delta card={kpis.returnRate} lowerIsBetter />
        <Sparkline values={values(kpis.returnRate)} />
      </li>
      <li className={styles.kpi}>
        <p className={styles.kpiLabel}>مبيعات عبر أفندي</p>
        <p className={styles.kpiValue}>
          {kpis.salesViaEfendiPercent === null ? '—' : asPercent(kpis.salesViaEfendiPercent)}
        </p>
        <AiTag>يبدأ مع أفندي</AiTag>
      </li>
      <li className={cx(styles.kpi, styles.kpiDark)}>
        <p className={styles.kpiLabel}>بانتظار الشحن الآن</p>
        <p className={styles.kpiValue}>
          {awaitingShipment === undefined ? '—' : formatCount(awaitingShipment)}
        </p>
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
  const kpis = useKpis(days);
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
              <div className={cx(styles.body, (dashboard.isFetching || kpis.isFetching) && styles.stale)}>
          {kpis.data ? (
            <Kpis kpis={kpis.data} awaitingShipment={data.ordersAwaitingShipment} />
          ) : kpis.isError ? (
            <p className={styles.muted} role="alert">
              {errorMessage(kpis.error)}
            </p>
          ) : (
            <div className={styles.kpiSkeleton} aria-busy="true" aria-label="جارٍ تحميل المؤشرات" />
          )}

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
