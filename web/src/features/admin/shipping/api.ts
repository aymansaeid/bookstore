import { adminRequest } from '../session';

/** A paid extra next to standard delivery, e.g. express. */
export interface ShippingOption {
  /** 2–30 of a-z, 0-9, '-'; not «standard» or «pickup». */
  code: string;
  name: string;
  carrier: string | null;
  price: number;
  minDays: number | null;
  maxDays: number | null;
}

/** API §10 AdminShippingZoneDto. */
export interface AdminShippingZone {
  id: number;
  name: string;
  flatRate: number;
  currency: string;
  /** ISO 3166-1 alpha-2, sorted. A country belongs to one zone at most. */
  countryCodes: string[];
  isActive: boolean;
  standardCarrier: string | null;
  standardMinDays: number | null;
  standardMaxDays: number | null;
  freeShippingThreshold: number | null;
  options: ShippingOption[];
}

/** POST and PUT /shipping-zones. */
export interface ZoneInput {
  name: string;
  flatRate: number;
  countryCodes: string[];
}

/** PUT /shipping-zones/{id}/delivery: full replacement; the flat rate is untouched. */
export interface DeliveryInput {
  standardCarrier: string | null;
  standardMinDays: number | null;
  standardMaxDays: number | null;
  freeShippingThreshold: number | null;
  options: ShippingOption[];
}

/** ShippingZone.cs limits. */
export const SHIPPING_LIMITS = {
  name: 200,
  carrier: 100,
  optionName: 100,
  maxOptions: 5,
  maxDays: 60,
  reservedCodes: ['standard', 'pickup'],
} as const;

const BASE = '/api/admin/shipping-zones';
const one = (id: number) => `${BASE}/${String(id)}`;

export const adminShippingApi = {
  list: (signal?: AbortSignal) => adminRequest<AdminShippingZone[]>(BASE, { signal }),
  create: (body: ZoneInput) => adminRequest<AdminShippingZone>(BASE, { method: 'POST', body }),
  update: (id: number, body: ZoneInput) =>
    adminRequest<AdminShippingZone>(one(id), { method: 'PUT', body }),
  setDelivery: (id: number, body: DeliveryInput) =>
    adminRequest<AdminShippingZone>(`${one(id)}/delivery`, { method: 'PUT', body }),
  setActive: (id: number, isActive: boolean) =>
    adminRequest<undefined>(`${one(id)}/active`, { method: 'PUT', body: { isActive } }),
  remove: (id: number) => adminRequest<undefined>(one(id), { method: 'DELETE' }),
};