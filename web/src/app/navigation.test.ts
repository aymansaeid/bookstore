import { describe, expect, it } from 'vitest';

import { safeReturnTo, activeBottomNavId, activeNavId, searchUrl } from '@/app/navigation';

describe('activeNavId', () => {
  it.each([
    ['/', '', 'home'],
    ['/search', '', 'library'],
    ['/search', '?q=زاد', 'library'],
    ['/search', '?minVolumes=10', 'encyclopedias'],
    ['/books/zad', '', 'library'],
    ['/category/x', '', 'library'],
    ['/paths', '', 'paths'],
    ['/paths/x', '', 'paths'],
    ['/ask', '', 'ask'],
    ['/cart', '', null],
    ['/pathsx', '', null],
  ])('%s%s → %s', (pathname, search, expected) => {
    expect(activeNavId(pathname, search)).toBe(expected);
  });
});

describe('activeBottomNavId', () => {
  it.each([
    ['/', 'home'],
    ['/search', 'library'],
    ['/books/zad', 'library'],
    ['/paths', 'library'],
    ['/ask', 'ask'],
    ['/cart', 'cart'],
    ['/checkout/success', 'cart'],
    ['/account', 'account'],
    ['/account/orders', 'account'],
    ['/track', null],
  ])('%s → %s', (pathname, expected) => {
    expect(activeBottomNavId(pathname)).toBe(expected);
  });
});

describe('searchUrl', () => {
  it('encodes Arabic queries', () => {
    expect(searchUrl('زاد المعاد')).toBe(
      '/search?q=%D8%B2%D8%A7%D8%AF+%D8%A7%D9%84%D9%85%D8%B9%D8%A7%D8%AF',
    );
  });
});

describe('safeReturnTo', () => {
  it.each([
    ['/account/orders?x=1', '/account/orders?x=1'],
    [null, '/account'],
    ['', '/account'],
    ['https://evil.com', '/account'],
    ['//evil.com', '/account'],
    ['/\\evil.com', '/account'],
    ['javascript:alert(1)', '/account'],
  ])('%s → %s', (value, expected) => {
    expect(safeReturnTo(value)).toBe(expected);
  });
});
