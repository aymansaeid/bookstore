import type { BookBadge, BookFormat, ReaderLevel } from '@/shared/api/enums';
import type { PagedResult } from '@/shared/api/types';

export interface CategoryRef {
  id: number;
  slug: string;
  name: string;
}

export interface MuhaqqiqRef {
  id: number;
  slug: string;
  name: string;
}

/** API guide §4e. */
export interface BookImage {
  id: number;
  url: string;
  altText: string | null;
  displayOrder: number;
  isCover: boolean;
  width: number | null;
  height: number | null;
  variants: { width: number; url: string }[];
  srcSet: string;
}

/** API guide §4c BookSummaryDto: edition picker, related cards, library, paths. */
export interface BookSummary {
  id: number;
  slug: string;
  title: string;
  author: string;
  editionLabel: string | null;
  volumes: number | null;
  price: number;
  oldPrice: number | null;
  savingsAmount?: number | null;
  savingsPercent?: number | null;
  currency: string;
  inStock: boolean;
  coverImageUrl: string | null;
  coverImageSrcSet?: string | null;
  averageRating: number | null;
  reviewCount: number;
}

/** API guide §4, §4b, §4c PublicBookDto. */
export interface PublicBook extends BookSummary {
  subtitle: string | null;
  isbn: string | null;
  description: string | null;
  format: BookFormat;
  pageCount: number;
  language: string;
  publisher: string | null;
  publicationDate: string | null;
  weightGrams: number;
  heightMm: number;
  widthMm: number;
  depthMm: number;
  images: BookImage[];
  category: (CategoryRef & { parent: CategoryRef | null }) | null;
  muhaqqiqs: MuhaqqiqRef[];
  level: ReaderLevel | null;
  installmentsAllowed: boolean;
  highlights: string[];
  badges: BookBadge[];
  /** null in lists; [] when loaded but none exist. */
  editions: BookSummary[] | null;
  related: BookSummary[] | null;
  soldLast7Days?: number | null;
}

/** What a product card needs: a summary, plus list-only extras when present. */
export type BookCardData = BookSummary & {
  badges?: BookBadge[];
  category?: { name: string } | null;
  publisher?: string | null;
};

export type CatalogSort =
  'Relevance' | 'Bestselling' | 'Newest' | 'PriceAsc' | 'PriceDesc' | 'TopRated';

/** API guide §4d query parameters. */
export interface CatalogSearchParams {
  q?: string;
  category?: string;
  muhaqqiq?: string[];
  level?: ReaderLevel[];
  minPrice?: number;
  maxPrice?: number;
  minVolumes?: number;
  maxVolumes?: number;
  inStock?: boolean;
  installments?: boolean;
  badge?: BookBadge;
  sort?: CatalogSort;
  page?: number;
  pageSize?: number;
  facets?: boolean;
}

export interface FacetCount {
  id: number;
  slug: string;
  name: string;
  count: number;
}

export interface CatalogFacets {
  categories: (FacetCount & { children: FacetCount[] })[];
  muhaqqiqs: FacetCount[];
  levels: { level: ReaderLevel; count: number }[];
  minPrice: number | null;
  maxPrice: number | null;
  inStockCount: number;
}

export interface CatalogSearchResult {
  results: PagedResult<PublicBook>;
  facets: CatalogFacets | null;
  searchedTerms: string[];
  sort: CatalogSort;
}
