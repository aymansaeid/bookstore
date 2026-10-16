import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { CheckoutRequest, CheckoutResponse } from './types';

/**
 * Checkout state kept in sessionStorage: it lives for this tab only, survives
 * the round trip to the payment page, and is gone when the tab closes.
 *
 * - draft: what the customer typed, so coming back to /checkout restores it.
 * - addressChoice: a saved address id, 'new', or null (not chosen yet).
 * - attempt: the last checkout request and its Idempotency-Key (API §5), plus
 *   the order it created. The success and cancel pages read it.
 */
export const CHECKOUT_STORAGE_KEY = 'kitap-efendi:checkout';

export interface CheckoutDraft {
  email: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  stateOrProvince: string;
  postalCode: string;
  giftMessage: string;
}

export type AddressChoice = number | 'new' | null;

export interface CheckoutAttempt {
  /** The exact request body, serialised; any change means a new key. */
  fingerprint: string;
  key: string;
  request: CheckoutRequest;
  /** The email the order is filed under, needed to look it up (§5). */
  email: string;
  orderNumber: string | null;
  checkoutUrl: string | null;
  expiresAtUtc: string | null;
}

interface CheckoutState {
  draft: CheckoutDraft;
  addressChoice: AddressChoice;
  attempt: CheckoutAttempt | null;
  saveDraft: (values: Partial<CheckoutDraft>) => void;
  setAddressChoice: (choice: AddressChoice) => void;
  /** Same request as last time (and not expired) → same key; otherwise a new one. */
  keyFor: (request: CheckoutRequest) => string;
  recordOrder: (response: CheckoutResponse) => void;
  clearAttempt: () => void;
  /** After the order is paid: forget the draft, the address choice and the attempt. */
  reset: () => void;
}

export const EMPTY_DRAFT: CheckoutDraft = {
  email: '',
  recipientName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  stateOrProvince: '',
  postalCode: '',
  giftMessage: '',
};

const DRAFT_KEYS = Object.keys(EMPTY_DRAFT) as (keyof CheckoutDraft)[];

function sanitizeDraft(raw: unknown): CheckoutDraft {
  const draft = { ...EMPTY_DRAFT };
  if (typeof raw !== 'object' || raw === null) return draft;
  const record = raw as Record<string, unknown>;
  for (const key of DRAFT_KEYS) {
    const value = record[key];
    if (typeof value === 'string') draft[key] = value.slice(0, 400);
  }
  return draft;
}

function isExpired(attempt: CheckoutAttempt): boolean {
  if (attempt.expiresAtUtc === null) return false;
  const expiry = Date.parse(attempt.expiresAtUtc);
  return Number.isFinite(expiry) && expiry <= Date.now();
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set, get) => ({
      draft: EMPTY_DRAFT,
      addressChoice: null,
      attempt: null,

      saveDraft: (values) => {
        const draft = { ...get().draft };
        let changed = false;
        for (const key of DRAFT_KEYS) {
          const value = values[key];
          if (typeof value === 'string' && value !== draft[key]) {
            draft[key] = value;
            changed = true;
          }
        }
        if (changed) set({ draft });
      },

      setAddressChoice: (addressChoice) => {
        set({ addressChoice });
      },

      keyFor: (request) => {
        const fingerprint = JSON.stringify(request);
        const current = get().attempt;
        if (current?.fingerprint === fingerprint && !isExpired(current)) return current.key;
        const key = crypto.randomUUID();
        set({
          attempt: {
            fingerprint,
            key,
            request,
            email: request.customerEmail,
            orderNumber: null,
            checkoutUrl: null,
            expiresAtUtc: null,
          },
        });
        return key;
      },

      recordOrder: (response) => {
        const current = get().attempt;
        if (!current) return;
        set({
          attempt: {
            ...current,
            orderNumber: response.orderNumber,
            checkoutUrl: response.checkoutUrl,
            expiresAtUtc: response.expiresAtUtc,
          },
        });
      },

      clearAttempt: () => {
        set({ attempt: null });
      },

      reset: () => {
        set({ draft: EMPTY_DRAFT, addressChoice: null, attempt: null });
      },
    }),
    {
      name: CHECKOUT_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ draft, addressChoice, attempt }) => ({ draft, addressChoice, attempt }),
      merge: (persisted, current) => {
        const data = (typeof persisted === 'object' && persisted !== null ? persisted : {}) as {
          draft?: unknown;
          addressChoice?: unknown;
          attempt?: unknown;
        };
        const choice = data.addressChoice;
        const attempt = data.attempt as CheckoutAttempt | null | undefined;
        return {
          ...current,
          draft: sanitizeDraft(data.draft),
          addressChoice:
            choice === 'new' || (typeof choice === 'number' && Number.isSafeInteger(choice))
              ? choice
              : null,
          attempt:
            attempt && typeof attempt.key === 'string' && typeof attempt.fingerprint === 'string'
              ? attempt
              : null,
        };
      },
    },
  ),
);

/** The stored attempt, if it belongs to this order number (from the URL). */
export function useAttemptForOrder(orderNumber: string | null): CheckoutAttempt | null {
  const attempt = useCheckoutStore((state) => state.attempt);
  if (!orderNumber || !attempt?.orderNumber) return null;
  return attempt.orderNumber.toUpperCase() === orderNumber.toUpperCase() ? attempt : null;
}
