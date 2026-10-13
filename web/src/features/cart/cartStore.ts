import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Browser cart (API guide §5): ids and quantities only, never prices. The
 * cart page shows server totals from /api/orders/quote. Server rules
 * enforced here too: each book once, 1–10 per line.
 */
export const MAX_QUANTITY = 10;
export const CART_STORAGE_KEY = 'kitap-efendi:cart';

export interface CartLine {
  bookId: number;
  quantity: number;
}

interface CartData {
  lines: CartLine[];
  /** Uppercased; validity comes from the quote. */
  couponCode: string | null;
  /** Buying a whole reading path at its discount (API §7d). */
  readingPathId: number | null;
  giftWrap: boolean;
}

interface CartActions {
  /** Returns the line's quantity afterwards (unchanged = already at 10). */
  add: (bookId: number, quantity?: number) => number;
  setQuantity: (bookId: number, quantity: number) => void;
  remove: (bookId: number) => void;
  removeMany: (bookIds: readonly number[]) => void;
  setCoupon: (code: string | null) => void;
  setGiftWrap: (giftWrap: boolean) => void;
  setReadingPath: (readingPathId: number | null) => void;
  clear: () => void;
}

const EMPTY: CartData = { lines: [], couponCode: null, readingPathId: null, giftWrap: false };

const isId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

const clamp = (quantity: number) => Math.min(MAX_QUANTITY, Math.max(1, Math.trunc(quantity)));

const normalizeCoupon = (code: string): string | null => {
  const value = code.trim().toUpperCase().slice(0, 50);
  return value === '' ? null : value;
};

/** Rebuilds a valid cart from whatever is in storage (edited, corrupt, old). */
function sanitize(raw: unknown): CartData {
  if (typeof raw !== 'object' || raw === null) return EMPTY;
  const data = raw as Record<string, unknown>;
  const lines: CartLine[] = [];
  if (Array.isArray(data.lines)) {
    for (const item of data.lines as unknown[]) {
      if (typeof item !== 'object' || item === null) continue;
      const { bookId, quantity } = item as Record<string, unknown>;
      if (!isId(bookId) || typeof quantity !== 'number' || !(quantity >= 1)) continue;
      const existing = lines.find((line) => line.bookId === bookId);
      if (existing) existing.quantity = clamp(existing.quantity + quantity);
      else lines.push({ bookId, quantity: clamp(quantity) });
    }
  }
  return {
    lines,
    couponCode: typeof data.couponCode === 'string' ? normalizeCoupon(data.couponCode) : null,
    readingPathId: lines.length > 0 && isId(data.readingPathId) ? data.readingPathId : null,
    giftWrap: data.giftWrap === true,
  };
}

export const useCartStore = create<CartData & CartActions>()(
  persist(
    (set, get) => ({
      ...EMPTY,

      add: (bookId, quantity = 1) => {
        if (!isId(bookId) || !Number.isFinite(quantity) || quantity < 1) return 0;
        const existing = get().lines.find((line) => line.bookId === bookId);
        if (!existing) {
          const next = clamp(quantity);
          set({ lines: [...get().lines, { bookId, quantity: next }] });
          return next;
        }
        const next = clamp(existing.quantity + quantity);
        if (next !== existing.quantity) {
          set({
            lines: get().lines.map((line) =>
              line.bookId === bookId ? { bookId, quantity: next } : line,
            ),
          });
        }
        return next;
      },

      setQuantity: (bookId, quantity) => {
        if (!Number.isFinite(quantity)) return;
        const next = clamp(quantity);
        set({
          lines: get().lines.map((line) =>
            line.bookId === bookId ? { bookId, quantity: next } : line,
          ),
        });
      },

      remove: (bookId) => {
        get().removeMany([bookId]);
      },

      removeMany: (bookIds) => {
        const remove = new Set(bookIds);
        const lines = get().lines.filter((line) => !remove.has(line.bookId));
        set({ lines, readingPathId: lines.length > 0 ? get().readingPathId : null });
      },

      setCoupon: (code) => {
        set({ couponCode: code === null ? null : normalizeCoupon(code) });
      },
      setGiftWrap: (giftWrap) => {
        set({ giftWrap });
      },
      setReadingPath: (readingPathId) => {
        set({ readingPathId });
      },
      clear: () => {
        set(EMPTY);
      },
    }),
    {
      name: CART_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ lines, couponCode, readingPathId, giftWrap }) => ({
        lines,
        couponCode,
        readingPathId,
        giftWrap,
      }),
      merge: (persisted, current) => ({ ...current, ...sanitize(persisted) }),
    },
  ),
);

/** Header and bottom-nav badge: number of books (lines). */
export const useCartLineCount = () => useCartStore((state) => state.lines.length);

/** Other tabs' changes arrive as `storage` events; reload the cart from storage. */
export function initCartSync(): void {
  window.addEventListener('storage', (event) => {
    if (event.key === CART_STORAGE_KEY) void useCartStore.persist.rehydrate();
  });
}
