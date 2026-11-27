import { counted } from '@/shared/lib/format';

/** API §7d: estimatedWeeks is a number. Up to 8 weeks in weeks, then in months. */
export function durationPhrase(weeks: number): string {
  if (weeks <= 8) return counted('weeks', Math.max(1, weeks));
  return counted('months', Math.round(weeks / 4.345));
}

/** «صفحتان», "320 pages". */
export const pagesPhrase = (count: number): string => counted('pages', count);

/** «٢١٤ قارئاً», "214 readers" (the page wraps it: «بدأه …»). */
export const readersPhrase = (count: number): string => counted('readers', count);