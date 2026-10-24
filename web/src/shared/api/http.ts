import { env } from '@/app/env';

import { ApiError } from './ApiError';

type QueryValue = string | number | boolean | readonly (string | number)[] | null | undefined;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Sent as JSON. */
  body?: unknown;
  /** Sent as multipart/form-data (admin image upload). */
  formData?: FormData;
  /** Empty values are skipped; arrays repeat the key (?level=A&level=B). */
  query?: Record<string, QueryValue>;
  /** Customer or admin access token (step 4 supplies it). */
  accessToken?: string | null;
  headers?: Record<string, string>;
  signal?: AbortSignal;
    responseType?: 'json' | 'blob';
}

/**
 * API guide §3: these must send cookies even when the API is on another
 * origin (production: api.kitapefendi.com), so the refresh cookie travels.
 */
const CREDENTIALED_PREFIXES = ['/api/customers/auth/', '/api/customers/me/delete'];

export function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    const values = typeof value === 'object' ? value : [value];
    for (const item of values) params.append(key, String(item));
  }
  const search = params.toString();
  return `${env.apiBaseUrl}${path}${search ? `?${search}` : ''}`;
}

/**
 * The single way the app talks to the API. Resolves with the parsed JSON
 * (undefined for 204) and throws ApiError for anything else. An aborted
 * request rethrows the AbortError untouched so TanStack Query can cancel quietly.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, formData, query, accessToken, signal } = options;

  const blob = options.responseType === 'blob';

  const headers = new Headers({ Accept: blob ? '*/*' : 'application/json', ...options.headers });
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const init: RequestInit = {
    method,
    headers,
    signal: signal ?? null,
    credentials: CREDENTIALED_PREFIXES.some((prefix) => path.startsWith(prefix))
      ? 'include'
      : 'same-origin',
  };
  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
    init.body = JSON.stringify(body);
  } else if (formData) {
    init.body = formData; // the browser sets the multipart boundary itself
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), init);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw ApiError.network();
  }

  if (!response.ok) throw await ApiError.fromResponse(response);
  if (response.status === 204) return undefined as T;
    if (blob) return (await response.blob()) as T;

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
