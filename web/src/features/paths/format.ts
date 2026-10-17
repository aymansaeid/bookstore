import { arabicPlural } from '@/shared/lib/format';

const weeksPhrase = (count: number) =>
  arabicPlural(count, { one: 'أسبوع واحد', two: 'أسبوعان', few: 'أسابيع', many: 'أسبوعاً' });

const monthsPhrase = (count: number) =>
  arabicPlural(count, { one: 'شهر واحد', two: 'شهران', few: 'أشهر', many: 'شهراً' });

/** API §7d: estimatedWeeks is a number. Up to 8 weeks in weeks, then in months. */
export function durationPhrase(weeks: number): string {
  if (weeks <= 8) return weeksPhrase(Math.max(1, weeks));
  return monthsPhrase(Math.round(weeks / 4.345));
}

export const pagesPhrase = (count: number): string =>
  arabicPlural(count, { one: 'صفحة واحدة', two: 'صفحتان', few: 'صفحات', many: 'صفحة' });

/** «بدأه ٢١٤ قارئاً». */
export const readersPhrase = (count: number): string =>
  count === 0
    ? 'كن أول من يبدؤه'
    : `بدأه ${arabicPlural(count, { one: 'قارئ واحد', two: 'قارئان', few: 'قرّاء', many: 'قارئاً' })}`;
