import { useState } from 'react';

import { formatCount, formatMoney, formatPlainDate } from '@/shared/lib/format';

import type { Dashboard } from '../api';

import styles from './Charts.module.css';
import { useElementWidth } from './useElementWidth';

const HEIGHT = 240;
const PAD = { top: 16, right: 12, bottom: 28, left: 56 };

const compact = new Intl.NumberFormat('ar-EG', { notation: 'compact', maximumFractionDigits: 1 });
/** Axis dates stay short («٥ أكتوبر») so they never collide. */
const shortDay = new Intl.DateTimeFormat('ar-EG', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const axisDate = (day: string) => shortDay.format(new Date(`${day}T12:00:00Z`));

/** 1, 2, 2.5 or 5 × 10ⁿ: a round top for the axis. */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * power >= value) ?? 10;
  return step * power;
}

/**
 * Daily revenue (spec 5.10 «الإيرادات»), one series, so no legend: the card
 * title names it. Time runs left to right like every chart, even in RTL.
 * Hover or tap for the day; the same numbers are in the table below.
 */
export function RevenueChart({ data }: { data: Dashboard }) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const days = data.dailyRevenue;
  const max = niceMax(Math.max(...days.map((day) => day.revenue), 0));
  const plotWidth = Math.max(0, width - PAD.left - PAD.right);
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const x = (index: number) =>
    PAD.left + (days.length <= 1 ? plotWidth / 2 : (index / (days.length - 1)) * plotWidth);
  const y = (value: number) => PAD.top + plotHeight - (value / max) * plotHeight;

  const line = days.map((day, index) => `${x(index).toFixed(1)},${y(day.revenue).toFixed(1)}`);
  const area =
    days.length > 0
      ? `M${x(0).toFixed(1)},${y(0).toFixed(1)} L${line.join(' L')} L${x(days.length - 1).toFixed(1)},${y(0).toFixed(1)} Z`
      : '';
  const ticks = [0, max / 2, max];
  // Three labels when there's room, first and last on phones.
  const last = days.length - 1;
  const labelIndexes =
    days.length <= 1
      ? [0]
      : plotWidth >= 360 && days.length > 2
        ? [0, Math.floor(last / 2), last]
        : [0, last];
  const current = active === null ? null : days[active];

  const pick = (clientX: number, rect: DOMRect) => {
    if (days.length === 0 || plotWidth <= 0) return;
    const ratio = (clientX - rect.left - PAD.left) / plotWidth;
    setActive(Math.min(days.length - 1, Math.max(0, Math.round(ratio * (days.length - 1)))));
  };

  return (
    <div className={styles.chartWrap}>
      <div ref={ref} className={styles.chart} dir="ltr">
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={`الإيرادات اليومية من ${formatPlainDate(data.from)} إلى ${formatPlainDate(data.to)}`}
            onPointerMove={(event) => {
              pick(event.clientX, event.currentTarget.getBoundingClientRect());
            }}
            onPointerDown={(event) => {
              pick(event.clientX, event.currentTarget.getBoundingClientRect());
            }}
            onPointerLeave={() => {
              setActive(null);
            }}
          >
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  className={styles.grid}
                  x1={PAD.left}
                  x2={PAD.left + plotWidth}
                  y1={y(tick)}
                  y2={y(tick)}
                />
                <text
                  className={styles.axis}
                  x={PAD.left - 8}
                  y={y(tick)}
                  textAnchor="end"
                  dominantBaseline="middle"
                >
                  {compact.format(tick)}
                </text>
              </g>
            ))}
            {labelIndexes.map((index) => {
              const day = days[index];
              if (!day) return null;
              return (
                <text
                  key={day.date}
                  className={styles.axis}
                  x={x(index)}
                  y={HEIGHT - 8}
                  textAnchor={index === 0 ? 'start' : index === days.length - 1 ? 'end' : 'middle'}
                >
                  {axisDate(day.date)}
                </text>
              );
            })}
            <path className={styles.area} d={area} />
            <polyline className={styles.line} points={line.join(' ')} />
            {active !== null && current && (
              <g>
                <line
                  className={styles.crosshair}
                  x1={x(active)}
                  x2={x(active)}
                  y1={PAD.top}
                  y2={PAD.top + plotHeight}
                />
                <circle className={styles.dot} cx={x(active)} cy={y(current.revenue)} r={5} />
              </g>
            )}
          </svg>
        )}
        {current && active !== null && (
          <div
            className={styles.tooltip}
            dir="rtl"
            // The chart is physically left-to-right, so a physical `left` is right here.
            style={{ left: `${String(Math.min(Math.max(x(active), 80), width - 80))}px` }}
          >
            <b>{formatMoney(current.revenue, data.currency)}</b>
            <span>
              {formatPlainDate(current.date)} · {formatCount(current.orders)} طلب
            </span>
          </div>
        )}
      </div>

      <details className={styles.table}>
        <summary>عرض الأرقام كجدول</summary>
        <div className={styles.tableScroll}>
          <table>
            <thead>
              <tr>
                <th scope="col">اليوم</th>
                <th scope="col">الإيرادات</th>
                <th scope="col">الطلبات</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day.date}>
                  <td>{formatPlainDate(day.date)}</td>
                  <td>{formatMoney(day.revenue, data.currency)}</td>
                  <td>{formatCount(day.orders)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
