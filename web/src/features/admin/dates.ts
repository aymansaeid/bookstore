/** The store keeps its books in Istanbul time (API §10: «Istanbul local days»). */
const STORE_TIME_ZONE = 'Europe/Istanbul';

const isoDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: STORE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Today in Istanbul as YYYY-MM-DD. Impure: call it in handlers or query functions. */
export const storeToday = (): string => isoDay.format(new Date());

/** The Istanbul calendar day of an instant, as YYYY-MM-DD. */
export const storeDayOf = (iso: string): string => isoDay.format(new Date(iso));

/** The last second of an Istanbul day. Turkey has kept UTC+3 all year since 2016. */
export const endOfStoreDay = (day: string): string => `${day}T23:59:59+03:00`;

/** YYYY-MM-DD plus `days` (negative goes back). Pure calendar arithmetic in UTC. */
export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** The last `days` days including today, and the same length just before it. */
export function rangeOf(days: number): {
  current: { from: string; to: string };
  previous: { from: string; to: string };
} {
  const to = storeToday();
  const from = addDays(to, -(days - 1));
  return {
    current: { from, to },
    previous: { from: addDays(from, -days), to: addDays(from, -1) },
  };
}
