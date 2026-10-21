/**
 * Folds Arabic text for client-side search: drops diacritics and tatweel,
 * unifies hamza forms on alef, alef maqsura and ta marbuta. Latin goes lowercase.
 */
export const arabicFold = (text: string): string =>
  text
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase();