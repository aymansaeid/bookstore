import { customerRequest } from '@/features/auth/session';

/** API §7 CustomerAddressDto. At most 10 per customer; the default comes first. */
export interface SavedAddress {
  id: number;
  label: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  stateOrProvince: string | null;
  postalCode: string;
  countryCode: string;
  isDefault: boolean;
}

/** The body's `address` object (SaveAddressData). */
export type AddressInput = Omit<SavedAddress, 'id' | 'isDefault'>;

export const MAX_ADDRESSES = 10;

export const addressApi = {
  list: () => customerRequest<SavedAddress[]>('/api/customers/me/addresses'),
  /** 409 Customer.AddressLimitReached at 10. The first address becomes the default. */
  add: (address: AddressInput, isDefault: boolean) =>
    customerRequest<SavedAddress>('/api/customers/me/addresses', {
      method: 'POST',
      body: { address, isDefault },
    }),
  update: (id: number, address: AddressInput) =>
    customerRequest<SavedAddress>(`/api/customers/me/addresses/${String(id)}`, {
      method: 'PUT',
      body: { address },
    }),
  /** Deleting the default promotes another one. */
  remove: (id: number) =>
    customerRequest<undefined>(`/api/customers/me/addresses/${String(id)}`, { method: 'DELETE' }),
  setDefault: (id: number) =>
    customerRequest<undefined>(`/api/customers/me/addresses/${String(id)}/default`, {
      method: 'PUT',
    }),
};
