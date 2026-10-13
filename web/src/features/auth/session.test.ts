import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  customerRequest,
  getSession,
  refreshSession,
  resetSessionForTests,
} from '@/features/auth/session';
import type { Customer } from '@/features/auth/types';

const customer: Customer = {
  id: 3,
  email: 'ahmad@example.com',
  firstName: 'أحمد',
  lastName: 'كريم',
  phone: null,
  isEmailVerified: true,
  acceptsMarketingEmails: false,
  createdAtUtc: '2026-10-01T00:00:00Z',
  readingLevel: null,
  monthlyBudget: null,
  interestCategoryIds: [],
};

const ok = (body: unknown) => () =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
const unauthorized = () => () => new Response(null, { status: 401 });
const auth = (token: string) =>
  ok({
    accessToken: token,
    expiresAtUtc: new Date(Date.now() + 15 * 60_000).toISOString(),
    customer,
  });

const REFRESH = '/api/customers/auth/refresh';
const SUMMARY = '/api/customers/me/summary';

/** Each path answers with its queued responses, in order. Records every call. */
function mockApi(routes: Record<string, (() => Response)[]>) {
  const calls: { path: string; auth: string | null }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string, init: RequestInit) => {
      const path = new URL(input, 'http://localhost').pathname;
      calls.push({ path, auth: new Headers(init.headers).get('Authorization') });
      const next = routes[path]?.shift();
      return Promise.resolve(next ? next() : new Response(null, { status: 404 }));
    }),
  );
  return calls;
}

const countCalls = (calls: { path: string }[], path: string) =>
  calls.filter((call) => call.path === path).length;

beforeEach(() => {
  resetSessionForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('customer session', () => {
  it('becomes a guest when the refresh cookie is missing or invalid', async () => {
    mockApi({ [REFRESH]: [unauthorized()] });
    await expect(refreshSession()).resolves.toBeNull();
    expect(getSession().status).toBe('guest');
  });

  it('restores the customer from the refresh cookie', async () => {
    mockApi({ [REFRESH]: [auth('t1')] });
    await refreshSession();
    expect(getSession()).toEqual({ status: 'authenticated', customer });
  });

  it('shares ONE refresh between parallel requests', async () => {
    const calls = mockApi({ [REFRESH]: [auth('t1')], [SUMMARY]: [ok({}), ok({})] });
    await Promise.all([customerRequest(SUMMARY), customerRequest(SUMMARY)]);
    expect(countCalls(calls, REFRESH)).toBe(1);
    expect(calls.filter((c) => c.path === SUMMARY).map((c) => c.auth)).toEqual([
      'Bearer t1',
      'Bearer t1',
    ]);
  });

  it('refreshes once and retries once after a 401', async () => {
    const calls = mockApi({
      [REFRESH]: [auth('t1'), auth('t2')],
      [SUMMARY]: [unauthorized(), ok({ orderCount: 1 })],
    });
    await refreshSession();
    await expect(customerRequest(SUMMARY)).resolves.toEqual({ orderCount: 1 });
    expect(countCalls(calls, REFRESH)).toBe(2);
    expect(calls.at(-1)?.auth).toBe('Bearer t2');
  });

  it('signs out when the retry refresh is rejected', async () => {
    mockApi({ [REFRESH]: [auth('t1'), unauthorized()], [SUMMARY]: [unauthorized()] });
    await refreshSession();
    await expect(customerRequest(SUMMARY)).rejects.toMatchObject({ status: 401 });
    expect(getSession().status).toBe('guest');
  });

  it('does not call the server for a known guest', async () => {
    const calls = mockApi({ [REFRESH]: [unauthorized()] });
    await refreshSession();
    await expect(customerRequest(SUMMARY)).rejects.toMatchObject({ status: 401 });
    expect(calls).toHaveLength(1);
  });
});
