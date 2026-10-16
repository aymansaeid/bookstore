import { STORE_TIME_ZONE } from '@/app/locale';

const dayFormat = new Intl.DateTimeFormat('ar-EG', {
  timeZone: STORE_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/** API §5b: minDays/maxDays are business days. Turkey's weekend is Saturday–Sunday. */
export function addBusinessDays(from: Date, days: number): Date {
  const date = new Date(from);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const weekday = date.getDay();
    if (weekday !== 0 && weekday !== 6) added += 1;
  }
  return date;
}

/** «يصلك الثلاثاء ١٤ أكتوبر» or «يصلك بين … و…». */
export function deliveryWindow(minDays: number, maxDays: number, now: Date = new Date()): string {
  const first = dayFormat.format(addBusinessDays(now, minDays));
  if (maxDays <= minDays) return `يصلك ${first}`;
  return `يصلك بين ${first} و${dayFormat.format(addBusinessDays(now, maxDays))}`;
}
