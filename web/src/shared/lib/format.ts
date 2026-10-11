/** Spec §8.5: Eastern Arabic digits. Step 3 adds money and date formatters here. */
const arabic = new Intl.NumberFormat('ar-EG');
const arabicPlain = new Intl.NumberFormat('ar-EG', { useGrouping: false });

export const formatCount = (value: number): string => arabic.format(value);

/** Counter bubbles: 1–99, then "٩٩+". */
export const formatBadgeCount = (value: number): string =>
  value > 99 ? `${arabic.format(99)}+` : arabic.format(value);

/** Years must not be grouped: ٢٠٢٦, not ٢٬٠٢٦. */
export const formatYear = (year: number): string => arabicPlain.format(year);
