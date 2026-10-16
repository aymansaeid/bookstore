import { useSyncExternalStore } from 'react';

import { ApiError } from '@/shared/api/ApiError';
import { apiRequest, type RequestOptions } from '@/shared/api/http';

import type { Customer, CustomerAuthResponse } from './types';

/**
 * Customer session (API guide §3).
 *
 * - The access token lives only in this module's memory, never in storage.
 * - Refresh tokens rotate and a reused one revokes the whole session, so only
 *   ONE refresh may run at a time, across every tab: a single in-flight
 *   promise per tab, plus a Web Lock between tabs.
 * - Tabs share login, refresh and logout over a BroadcastChannel. A tab that
 *   waited for the lock reuses the token another tab just got.
 */

export type SessionStatus = 'unknown' | 'guest' | 'authenticated';

export interface Session {
  status: SessionStatus;
  customer: Customer | null;
}

type SyncMessage =
  | { type: 'session'; accessToken: string; expiresAt: number; customer: Customer }
  | { type: 'logout' };

const LOCK_NAME = 'kitap-efendi:session-refresh';
const CHANNEL_NAME = 'kitap-efendi:session';
/** Refresh a minute before expiry instead of paying for a 401 round trip. */
const EXPIRY_MARGIN_MS = 60_000;
/** Used only if the server ever sends an unparseable expiry. */
const FALLBACK_LIFETIME_MS = 10 * 60_000;

let session: Session = { status: 'unknown', customer: null };
let accessToken: string | null = null;
let expiresAt = 0;
/** Bumped on every change, so a refresh that waited for the lock can see another tab did the work. */
let version = 0;
let inflight: Promise<string | null> | null = null;
let channel: BroadcastChannel | null = null;
let initialised = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function hasFreshToken(): boolean {
  return accessToken !== null && Date.now() < expiresAt - EXPIRY_MARGIN_MS;
}

function setAuthenticated(token: string, expiry: number, customer: Customer, broadcast: boolean) {
  accessToken = token;
  expiresAt = expiry;
  version += 1;
  session = { status: 'authenticated', customer };
  emit();
  if (broadcast) {
    channel?.postMessage({ type: 'session', accessToken: token, expiresAt: expiry, customer });
  }
}

function setGuest(broadcast: boolean) {
  const changed = session.status !== 'guest' || accessToken !== null;
  accessToken = null;
  expiresAt = 0;
  version += 1;
  if (changed) {
    session = { status: 'guest', customer: null };
    emit();
  }
  if (broadcast) channel?.postMessage({ type: 'logout' } satisfies SyncMessage);
}

function applyAuthResponse(response: CustomerAuthResponse) {
  const parsed = Date.parse(response.expiresAtUtc);
  const expiry = Number.isFinite(parsed) ? parsed : Date.now() + FALLBACK_LIFETIME_MS;
  setAuthenticated(response.accessToken, expiry, response.customer, true);
}

async function refreshExclusive(): Promise<string | null> {
  const seen = version;

  const work = async (): Promise<string | null> => {
    // Another tab refreshed while we waited for the lock: its token was broadcast here.
    if (version !== seen && hasFreshToken()) return accessToken;
    try {
      const response = await apiRequest<CustomerAuthResponse>('/api/customers/auth/refresh', {
        method: 'POST',
      });
      applyAuthResponse(response);
      return response.accessToken;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setGuest(true);
        return null;
      }
      throw error; // network or 5xx: keep the current state, let the caller decide
    }
  };

  if ('locks' in navigator) return await navigator.locks.request(LOCK_NAME, work);
  return await work();
}

/** Single-flight refresh. Resolves with the new token, or null when signed out. */
export function refreshSession(): Promise<string | null> {
  inflight ??= refreshExclusive().finally(() => {
    inflight = null;
  });
  return inflight;
}

async function getAccessToken(): Promise<string | null> {
  if (hasFreshToken()) return accessToken;
  if (session.status === 'guest') return null; // known guest: don't hit the server
  return refreshSession();
}

/**
 * Calls a /api/customers/me/* endpoint with the customer token.
 * On 401: refresh once, retry once. If that fails the user is signed out
 * and the 401 is rethrown.
 */
export async function customerRequest<T>(
  path: string,
  options: Omit<RequestOptions, 'accessToken'> = {},
): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new ApiError({ status: 401, code: 'Unauthorized', requestId: null });

  try {
    return await apiRequest<T>(path, { ...options, accessToken: token });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    // A parallel call may already have refreshed; use its token if so.
    const fresh = accessToken !== token && hasFreshToken() ? accessToken : await refreshSession();
    if (!fresh) throw error;
    return apiRequest<T>(path, { ...options, accessToken: fresh });
  }
}

/**
 * For public endpoints that also accept a customer token (quote, legal
 * preview, checkout): signed in → sent with the token, so the order joins the
 * account and saved addresses work; guest → sent without one.
 */
export async function optionalCustomerRequest<T>(
  path: string,
  options: Omit<RequestOptions, 'accessToken'> = {},
): Promise<T> {
  const token = await getAccessToken();
  if (!token) return apiRequest<T>(path, options);

  try {
    return await apiRequest<T>(path, { ...options, accessToken: token });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    const fresh = accessToken !== token && hasFreshToken() ? accessToken : await refreshSession();
    if (!fresh) throw error;
    return apiRequest<T>(path, { ...options, accessToken: fresh });
  }
}

/** POST /api/customers/auth/login. Throws ApiError (e.g. Customer.EmailNotVerified). */
export async function login(email: string, password: string): Promise<Customer> {
  const response = await apiRequest<CustomerAuthResponse>('/api/customers/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  applyAuthResponse(response);
  return response.customer;
}

/** Ends the session on the server and in every tab. Local sign-out happens even if the call fails. */
export async function logout(): Promise<void> {
  try {
    await apiRequest<undefined>('/api/customers/auth/logout', { method: 'POST' });
  } finally {
    setGuest(true);
  }
}

/** After a password change or account deletion the server has already ended every session. */
export function endSessionLocally(): void {
  setGuest(true);
}

/** Keep the header in sync after a profile edit (PUT /api/customers/me). */
export function updateSessionCustomer(customer: Customer): void {
  if (session.status !== 'authenticated' || !accessToken) return;
  setAuthenticated(accessToken, expiresAt, customer, true);
}

/** Call once at startup: joins the cross-tab channel and restores the session from the cookie. */
export function initSession(): void {
  if (initialised) return;
  initialised = true;

  if ('BroadcastChannel' in globalThis) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<SyncMessage>) => {
      const message = event.data;
      if (message.type === 'session') {
        setAuthenticated(message.accessToken, message.expiresAt, message.customer, false);
      } else {
        setGuest(false);
      }
    };
  }

  refreshSession().catch(() => {
    // Server unreachable: browse as a guest; the next customer call tries again.
    if (session.status === 'unknown') {
      session = { status: 'guest', customer: null };
      emit();
    }
  });
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getSession = (): Session => session;

export function useSession(): Session {
  return useSyncExternalStore(subscribeSession, getSession, getSession);
}

/** Test helper: back to a fresh page load. */
export function resetSessionForTests(): void {
  session = { status: 'unknown', customer: null };
  accessToken = null;
  expiresAt = 0;
  version = 0;
  inflight = null;
  listeners.clear();
}
