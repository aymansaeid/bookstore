import { useSyncExternalStore } from 'react';

import { ApiError } from '@/shared/api/ApiError';
import { apiRequest, type RequestOptions } from '@/shared/api/http';

/**
 * Admin session (API guide §3). The admin token lives only in this module's
 * memory: never in storage. It lasts 60 minutes and can't be refreshed, so
 * any 401 ends the session and the admin signs in again.
 *
 * Open admin tabs share the token over a BroadcastChannel: a new tab asks
 * "hello?" and an open tab answers, so links opened in a new tab work.
 * Signing out in one tab signs out all of them.
 */

export type AdminStatus = 'unknown' | 'signedOut' | 'signedIn';

export interface AdminSession {
  status: AdminStatus;
  email: string | null;
  role: string | null;
  /** Why the last session ended, for the login screen. */
  ended: 'expired' | null;
}

interface LoginResponse {
  accessToken: string;
  expiresAtUtc: string;
  email: string;
  role: string;
}

export interface AdminProfile {
  id: number;
  email: string;
  role: string;
  createdAtUtc: string;
  lastLoginAtUtc: string | null;
}

type SyncMessage =
  | { type: 'hello' }
  | { type: 'session'; token: string; expiresAt: number; email: string; role: string }
  | { type: 'logout' };

const CHANNEL_NAME = 'kitap-efendi:admin';
/** How long a new tab waits for another tab's token before showing the login. */
const HELLO_TIMEOUT_MS = 300;
/** Treat the token as expired a little early, so no request races the expiry. */
const EXPIRY_MARGIN_MS = 30_000;

let session: AdminSession = { status: 'unknown', email: null, role: null, ended: null };
let token: string | null = null;
let expiresAt = 0;
let expiryTimer: number | undefined;
let channel: BroadcastChannel | null = null;
let initialised = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

const hasFreshToken = () => token !== null && Date.now() < expiresAt - EXPIRY_MARGIN_MS;

function setSignedIn(next: { token: string; expiresAt: number; email: string; role: string }) {
  token = next.token;
  expiresAt = next.expiresAt;
  session = { status: 'signedIn', email: next.email, role: next.role, ended: null };
  window.clearTimeout(expiryTimer);
  expiryTimer = window.setTimeout(
    () => {
      endAdminSession('expired');
    },
    Math.max(0, expiresAt - EXPIRY_MARGIN_MS - Date.now()),
  );
  emit();
}

function setSignedOut(ended: AdminSession['ended']) {
  token = null;
  expiresAt = 0;
  window.clearTimeout(expiryTimer);
  session = { status: 'signedOut', email: null, role: null, ended };
  emit();
}

/** Idempotent; the admin layout and login page call it on mount. */
export function initAdminSession(): void {
  if (initialised) return;
  initialised = true;

  if (!('BroadcastChannel' in globalThis)) {
    setSignedOut(null);
    return;
  }

  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event: MessageEvent<SyncMessage>) => {
    const message = event.data;
    if (message.type === 'hello') {
      if (hasFreshToken() && token && session.email && session.role) {
        channel?.postMessage({
          type: 'session',
          token,
          expiresAt,
          email: session.email,
          role: session.role,
        } satisfies SyncMessage);
      }
    } else if (message.type === 'session') {
      if (message.expiresAt - EXPIRY_MARGIN_MS > Date.now() && message.expiresAt > expiresAt) {
        setSignedIn(message);
      }
    } else if (session.status === 'signedIn') {
      setSignedOut(null);
    }
  };

  channel.postMessage({ type: 'hello' } satisfies SyncMessage);
  window.setTimeout(() => {
    if (session.status === 'unknown') setSignedOut(null);
  }, HELLO_TIMEOUT_MS);
}

/** POST /api/admin/auth/login. Throws ApiError (Auth.InvalidCredentials, RateLimited). */
export async function adminLogin(email: string, password: string): Promise<void> {
  const response = await apiRequest<LoginResponse>('/api/admin/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  const parsed = Date.parse(response.expiresAtUtc);
  const next = {
    token: response.accessToken,
    expiresAt: Number.isFinite(parsed) ? parsed : Date.now() + 55 * 60_000,
    email: response.email,
    role: response.role,
  };
  setSignedIn(next);
  channel?.postMessage({ type: 'session', ...next } satisfies SyncMessage);
}

/** Signs out this tab and every other admin tab. */
export function endAdminSession(ended: AdminSession['ended'] = null): void {
  if (session.status !== 'signedIn' && token === null) return;
  setSignedOut(ended);
  channel?.postMessage({ type: 'logout' } satisfies SyncMessage);
}

/** Every /api/admin/* call. A 401 (expired, revoked, deactivated) ends the session. */
export async function adminRequest<T>(
  path: string,
  options: Omit<RequestOptions, 'accessToken'> = {},
): Promise<T> {
  if (!hasFreshToken()) {
    endAdminSession('expired');
    throw new ApiError({ status: 401, code: 'Unauthorized', requestId: null });
  }
  try {
    return await apiRequest<T>(path, { ...options, accessToken: token });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) endAdminSession('expired');
    throw error;
  }
}

/** GET /api/admin/auth/me: the layout calls it on load (a deactivated admin is refused). */
export const fetchAdminProfile = () => adminRequest<AdminProfile>('/api/admin/auth/me');

export function subscribeAdminSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getAdminSession = (): AdminSession => session;

export function useAdminSession(): AdminSession {
  return useSyncExternalStore(subscribeAdminSession, getAdminSession, getAdminSession);
}
