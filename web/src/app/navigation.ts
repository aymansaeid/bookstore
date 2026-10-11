import { paths } from '@/app/paths';

export type NavId = 'home' | 'library' | 'encyclopedias' | 'paths' | 'ask';
export type BottomNavId = 'home' | 'library' | 'ask' | 'cart' | 'account';

export interface NavItem {
  id: NavId;
  label: string;
  to: string;
  /** Red "AI" chip (spec §4.1). */
  aiBadge?: boolean;
  /** Leading ✦ mark. */
  spark?: boolean;
}

/** «الموسوعات» = multi-volume sets; maps to the catalog filter minVolumes (API §4d). */
export const ENCYCLOPEDIA_MIN_VOLUMES = 10;

export const searchUrl = (query: string): string =>
  `${paths.search}?${new URLSearchParams({ q: query }).toString()}`;

/** Spec §4.1 header links, in order. */
export const primaryNav: readonly NavItem[] = [
  { id: 'home', label: 'الرئيسية', to: paths.home },
  { id: 'library', label: 'المكتبة', to: paths.search },
  {
    id: 'encyclopedias',
    label: 'الموسوعات',
    to: `${paths.search}?minVolumes=${ENCYCLOPEDIA_MIN_VOLUMES}`,
  },
  { id: 'paths', label: 'مسارات القراءة', to: paths.readingPaths, aiBadge: true },
  { id: 'ask', label: 'اسأل أفندي', to: paths.askEfendi, spark: true },
];

const isUnder = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

/** Which header link is active. Query-aware, so «المكتبة» and «الموسوعات» don't both light up. */
export function activeNavId(pathname: string, search: string): NavId | null {
  if (pathname === paths.home) return 'home';
  if (pathname === paths.search) {
    return new URLSearchParams(search).has('minVolumes') ? 'encyclopedias' : 'library';
  }
  if (/^\/(category|muhaqqiq|books)\//.test(pathname)) return 'library';
  if (isUnder(pathname, paths.readingPaths)) return 'paths';
  if (pathname === paths.askEfendi) return 'ask';
  return null;
}

/** Which mobile bottom-nav tab is active (spec §5.11). */
export function activeBottomNavId(pathname: string): BottomNavId | null {
  if (pathname === paths.home) return 'home';
  if (pathname === paths.search || /^\/(category|muhaqqiq|books|paths)(\/|$)/.test(pathname)) {
    return 'library';
  }
  if (pathname === paths.askEfendi) return 'ask';
  if (pathname === paths.cart || isUnder(pathname, paths.checkout)) return 'cart';
  if (isUnder(pathname, paths.account.root)) return 'account';
  return null;
}
