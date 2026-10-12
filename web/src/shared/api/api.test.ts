import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { errorMessage, supportRequestId } from '@/shared/api/errorMessages';
import { serverFieldErrors, toFormPath } from '@/shared/api/formErrors';
import { apiRequest, buildUrl } from '@/shared/api/http';
import { shouldRetry } from '@/shared/api/queryClient';

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

function mockFetch(response: Response | Error) {
  const fn = vi.fn(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('buildUrl', () => {
  it('skips empty values and repeats arrays', () => {
    expect(
      buildUrl('/api/catalog/search', {
        q: 'زاد',
        level: ['Beginner', 'Specialist'],
        page: 2,
        inStock: true,
        sort: '',
        muhaqqiq: undefined,
      }),
    ).toBe(
      '/api/catalog/search?q=%D8%B2%D8%A7%D8%AF&level=Beginner&level=Specialist&page=2&inStock=true',
    );
  });
});

describe('apiRequest', () => {
  it('parses JSON on success', async () => {
    mockFetch(json(200, { currency: 'TRY' }));
    await expect(apiRequest('/api/store/config')).resolves.toEqual({ currency: 'TRY' });
  });

  it('returns undefined for 204', async () => {
    mockFetch(new Response(null, { status: 204 }));
    await expect(apiRequest('/api/x', { method: 'PUT' })).resolves.toBeUndefined();
  });

  it('turns ProblemDetails into ApiError with the stable code and request id', async () => {
    mockFetch(
      json(
        409,
        { title: 'Checkout.InsufficientStock', detail: 'Book 12…', status: 409 },
        { 'X-Request-Id': 'req-1' },
      ),
    );
    const error = await apiRequest('/api/orders/checkout').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      code: 'Checkout.InsufficientStock',
      requestId: 'req-1',
    });
    expect(errorMessage(error)).toBe('الكمية المطلوبة من أحد الكتب غير متوفرة حالياً.');
  });

  it('marks validation errors and maps their field paths', async () => {
    mockFetch(
      json(400, {
        title: 'One or more validation errors occurred.',
        status: 400,
        errors: { 'ShippingAddress.Phone': ['x'], 'Lines[0].Quantity': ['y'] },
      }),
    );
    const error = await apiRequest('/api/orders/checkout').catch((e: unknown) => e);
    expect(error).toMatchObject({ code: 'Validation' });
    expect(Object.keys(serverFieldErrors(error))).toEqual([
      'shippingAddress.phone',
      'lines.0.quantity',
    ]);
  });

  it('handles 429 with an empty body', async () => {
    mockFetch(new Response(null, { status: 429 }));
    const error = await apiRequest('/api/coupons/check').catch((e: unknown) => e);
    expect(errorMessage(error)).toBe('محاولات كثيرة، حاول بعد دقيقة.');
  });

  it('reports network failures', async () => {
    mockFetch(new TypeError('Failed to fetch'));
    const error = await apiRequest('/api/books').catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 0, code: 'Network' });
  });

  it('sends cookies to the auth endpoints only', async () => {
    const fetchMock = mockFetch(json(200, {}));
    await apiRequest('/api/customers/auth/refresh', { method: 'POST' });
    await apiRequest('/api/books');
    const credentials = fetchMock.mock.calls.map(
      (call) => (call as unknown as [string, RequestInit])[1].credentials,
    );
    expect(credentials).toEqual(['include', 'same-origin']);
  });

  it('exposes the request id only for server errors', async () => {
    mockFetch(json(500, { title: 'x', requestId: 'req-9' }));
    const error = await apiRequest('/api/books').catch((e: unknown) => e);
    expect(supportRequestId(error)).toBe('req-9');
    expect(errorMessage(error)).toBe('حدث خطأ غير متوقع. حاول مرة أخرى بعد قليل.');
  });
});

describe('toFormPath', () => {
  it.each([
    ['ShippingAddress.Phone', 'shippingAddress.phone'],
    ['Lines[0].Quantity', 'lines.0.quantity'],
    ['$.lines', 'lines'],
    ['Email', 'email'],
  ])('%s → %s', (key, path) => {
    expect(toFormPath(key)).toBe(path);
  });
});

describe('shouldRetry', () => {
  it('never retries client errors', () => {
    expect(shouldRetry(0, new ApiError({ status: 404, code: 'x', requestId: null }))).toBe(false);
    expect(
      shouldRetry(0, new ApiError({ status: 429, code: 'RateLimited', requestId: null })),
    ).toBe(false);
  });

  it('retries network and server errors twice', () => {
    expect(shouldRetry(0, ApiError.network())).toBe(true);
    expect(shouldRetry(1, new ApiError({ status: 503, code: 'x', requestId: null }))).toBe(true);
    expect(shouldRetry(2, ApiError.network())).toBe(false);
  });
});
