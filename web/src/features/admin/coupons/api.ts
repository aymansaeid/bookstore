import { adminRequest } from '../session';

/** Why a code does or doesn't work right now (server-computed, in this order). */
export type CouponStatus = 'Inactive' | 'Expired' | 'Exhausted' | 'Active';

/** API §10 AdminCouponDto. */
export interface AdminCoupon {
  id: number;
  /** Stored upper-case. */
  code: string;
  discountPercentage: number;
  expiresAtUtc: string;
  /** null = no limit. */
  maxRedemptions: number | null;
  timesRedeemed: number;
  remainingRedemptions: number | null;
  isActive: boolean;
  status: CouponStatus;
}

export interface CouponInput {
  discountPercentage: number;
  /** Must be in the future. */
  expiresAtUtc: string;
  maxRedemptions: number | null;
}

export interface NewCouponInput extends CouponInput {
  /** 3–50 letters, digits, - or _. The code never changes after creation. */
  code: string;
}

const BASE = '/api/admin/coupons';
const one = (id: number) => `${BASE}/${String(id)}`;

export const adminCouponsApi = {
  list: (signal?: AbortSignal) => adminRequest<AdminCoupon[]>(BASE, { signal }),
  create: (body: NewCouponInput) => adminRequest<AdminCoupon>(BASE, { method: 'POST', body }),
  update: (id: number, body: CouponInput) =>
    adminRequest<AdminCoupon>(one(id), { method: 'PUT', body }),
  setActive: (id: number, isActive: boolean) =>
    adminRequest<undefined>(`${one(id)}/active`, { method: 'PUT', body: { isActive } }),
  /** 409 once it has been used: it stays for reporting. */
  remove: (id: number) => adminRequest<undefined>(one(id), { method: 'DELETE' }),
};