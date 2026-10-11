import { matchRoutes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { paths } from '@/app/paths';
import { routes } from '@/app/routes';

/** Resolves a URL to its deepest matching route, ignoring the query string. */
function leafRoute(url: string) {
  const { pathname } = new URL(url, 'http://localhost');
  return matchRoutes(routes, pathname)?.at(-1)?.route;
}

function expectRealPage(url: string) {
  const leaf = leafRoute(url);
  expect(leaf, `${url} matched nothing`).toBeDefined();
  expect(leaf?.path, `${url} fell through to the 404 route`).not.toBe('*');
}

/** Every string leaf of `paths`, including nested groups. */
function staticPaths(node: unknown): string[] {
  if (typeof node === 'string') return [node];
  if (node && typeof node === 'object') return Object.values(node).flatMap(staticPaths);
  return [];
}

describe('routes', () => {
  // API guide §11: the backend puts these exact URLs in emails and payment
  // redirects. Renaming any of them breaks links already in customers' inboxes.
  it.each([
    '/verify-email?token=abc',
    '/reset-password?token=abc',
    '/login',
    '/forgot-password',
    '/track?order=BK-3F9A1C22D0',
    '/checkout/success?order=BK-3F9A1C22D0',
    '/checkout/cancel?order=BK-3F9A1C22D0',
    '/dev/mock-checkout?session=mock_1&order=BK-3F9A1C22D0',
    '/notify-me/confirm?token=abc',
    '/notify-me/unsubscribe?token=abc',
    `/books/${encodeURIComponent('زاد-المعاد')}`,
    '/books/zad-al-maad',
    '/admin/inventory',
    '/admin/returns',
  ])('backend-linked URL %s resolves to a page', expectRealPage);

  it.each(staticPaths(paths))('static path %s resolves to a page', expectRealPage);

  it.each([
    paths.category('الحديث-وعلومه'),
    paths.muhaqqiq('شعيب-الارناووط'),
    paths.book('زاد-المعاد'),
    paths.readingPath('من-الاربعين-الى-فتح-الباري'),
    paths.legal('privacy'),
    paths.account.order('BK-3F9A1C22D0'),
    paths.admin.order(12),
    paths.admin.return(5),
    paths.admin.book(7),
  ])('dynamic path %s resolves to a page', expectRealPage);

  it('encodes Arabic slugs and React Router decodes them back', () => {
    const url = paths.book('زاد-المعاد');
    expect(url).toBe('/books/%D8%B2%D8%A7%D8%AF-%D8%A7%D9%84%D9%85%D8%B9%D8%A7%D8%AF');
    expect(matchRoutes(routes, url)?.at(-1)?.params.slug).toBe('زاد-المعاد');
  });

  it('routes /admin/books/new to the editor, not to /admin/books/:id', () => {
    expect(leafRoute(paths.admin.newBook)?.path).toBe('books/new');
  });

  it('sends unknown URLs to a 404 page in both areas', () => {
    expect(leafRoute('/no-such-page')?.path).toBe('*');
    expect(leafRoute('/admin/no-such-page')?.path).toBe('*');
  });
});
