/** A list typed one item per line → the items, blanks dropped. */
export const splitLines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');

/** Blank → null, so the storefront falls back to the Arabic. */
export const orNull = (text: string | undefined) =>
  text === undefined || text.trim() === '' ? null : text.trim();