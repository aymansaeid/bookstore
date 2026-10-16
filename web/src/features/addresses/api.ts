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

export const addressApi = {
  list: () => customerRequest<SavedAddress[]>('/api/customers/me/addresses'),
};
