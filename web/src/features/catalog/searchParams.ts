import type { BookBadge, ReaderLevel } from '@/shared/api/enums';

import type { CatalogSearchParams, CatalogSort } from './types';

/**
 * Filter state lives in the query string (API §4d), so a filtered page can
 * be bookmarked and shared, and the back button restores it. Unknown or
 * invalid values are dropped, never sent to the API.
 */
export const PAGE_SIZE = 24;

const LEVELS: readonly ReaderLevel[] = ['Beginner', 'Intermediate', 'Specialist'];
const SORTS: readonly CatalogSort[] = [
  'Relevance',
  'Bestselling',
  'Newest',
  'PriceAsc',
  'PriceDesc',
  'TopRated',
];
const BADGES: readonly BookBadge[] = ['New', 'Deluxe', 'Bestseller'];

export interface VolumeOption {
  label: string;
  min?: number;
  max?: number;
}

/** Guide §4d volume pills. "10+" matches the «الموسوعات» nav link (?minVolumes=10). */
export const VOLUME_OPTIONS: readonly VolumeOption[] = [
  { label: 'مجلد واحد', max: 1 },
  { label: '٢–٥ مجلدات', min: 2, max: 5 },
  { label: '٦–٩ مجلدات', min: 6, max: 9 },
  { label: '١٠ مجلدات فأكثر', min: 10 },
];

export const SORT_LABELS: Readonly<Record<CatalogSort, string>> = {
  Relevance: 'الأقرب لبحثك',
  Bestselling: 'الأكثر مبيعاً',
  Newest: 'الأحدث',
  PriceAsc: 'السعر: من الأقل',
  PriceDesc: 'السعر: من الأعلى',
  TopRated: 'الأعلى تقييماً',
};

const text = (value: string | null): string | undefined => {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? undefined : trimmed;
};

const nonNegative = (value: string | null): number | undefined => {
  const raw = text(value);
  if (raw === undefined) return undefined;
  const number = Number(raw);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
};

const integer = (value: string | null): number | undefined => {
  const number = nonNegative(value);
  return number === undefined ? undefined : Math.trunc(number);
};

const oneOf = <T extends string>(allowed: readonly T[], value: string | null): T | undefined =>
  allowed.find((item) => item === value);

const manyOf = <T extends string>(allowed: readonly T[], values: string[]): T[] | undefined => {
  const picked = allowed.filter((item) => values.includes(item));
  return picked.length > 0 ? picked : undefined;
};

export function readFilters(search: URLSearchParams): CatalogSearchParams {
  const muhaqqiq = [
    ...new Set(
      search
        .getAll('muhaqqiq')
        .map((value) => value.trim())
        .filter((value) => value !== ''),
    ),
  ];
  const page = integer(search.get('page'));

  return {
    q: text(search.get('q'))?.slice(0, 200),
    category: text(search.get('category')),
    muhaqqiq: muhaqqiq.length > 0 ? muhaqqiq : undefined,
    level: manyOf(LEVELS, search.getAll('level')),
    minPrice: nonNegative(search.get('minPrice')),
    maxPrice: nonNegative(search.get('maxPrice')),
    minVolumes: integer(search.get('minVolumes')),
    maxVolumes: integer(search.get('maxVolumes')),
    inStock: search.get('inStock') === 'true' ? true : undefined,
    installments: search.get('installments') === 'true' ? true : undefined,
    badge: oneOf(BADGES, search.get('badge')),
    sort: oneOf(SORTS, search.get('sort')),
    page: page !== undefined && page > 1 ? page : undefined,
  };
}

const URL_KEYS = [
  'q',
  'category',
  'muhaqqiq',
  'level',
  'minPrice',
  'maxPrice',
  'minVolumes',
  'maxVolumes',
  'inStock',
  'installments',
  'badge',
  'sort',
  'page',
] as const;

/** Stable key order keeps URLs (and therefore query cache keys) identical. */
export function writeFilters(filters: CatalogSearchParams): URLSearchParams {
  const search = new URLSearchParams();
  for (const key of URL_KEYS) {
    const value = filters[key];
    if (value === undefined || value === false || value === '') continue;
    if (key === 'page' && value === 1) continue;
    if (Array.isArray(value)) {
      for (const item of value) search.append(key, String(item));
    } else {
      search.set(key, String(value));
    }
  }
  return search;
}

/** Patch that removes every filter but keeps q and sort. */
export const CLEARED_FILTERS: Partial<CatalogSearchParams> = {
  category: undefined,
  muhaqqiq: undefined,
  level: undefined,
  minPrice: undefined,
  maxPrice: undefined,
  minVolumes: undefined,
  maxVolumes: undefined,
  inStock: undefined,
  installments: undefined,
  badge: undefined,
};

export interface HiddenFacets {
  category?: boolean;
  muhaqqiq?: boolean;
}

/** For the «الفلاتر (٣)» button. Fixed page filters (category/muhaqqiq pages) don't count. */
export function activeFilterCount(filters: CatalogSearchParams, hide: HiddenFacets = {}): number {
  let count = 0;
  if (hide.category !== true && filters.category !== undefined) count += 1;
  if (hide.muhaqqiq !== true) count += filters.muhaqqiq?.length ?? 0;
  count += filters.level?.length ?? 0;
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) count += 1;
  if (filters.minVolumes !== undefined || filters.maxVolumes !== undefined) count += 1;
  if (filters.inStock === true) count += 1;
  if (filters.installments === true) count += 1;
  if (filters.badge !== undefined) count += 1;
  return count;
}
