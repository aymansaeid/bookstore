import { z } from 'zod';

import { i18n } from '@/i18n';

/** Looked up when a check fails, so messages follow the page's language (account.json). */
type MessageKey =
  | 'tooLong'
  | 'label'
  | 'recipient'
  | 'phoneRequired'
  | 'phoneInvalid'
  | 'line1'
  | 'city'
  | 'postal'
  | 'country';
const say = (key: MessageKey) => ({
  error: () => i18n.t(`addresses.validation.${key}`, { ns: 'account' }),
});

/** SaveAddressDataValidator + Order.Address rules (API §5, §7). */
const required = (message: MessageKey, max: number) =>
  z.string().trim().min(1, say(message)).max(max, say('tooLong'));
const optional = (max: number) => z.string().trim().max(max, say('tooLong'));

export const addressSchema = z.object({
  label: required('label', 50),
  recipientName: required('recipient', 200),
  phone: required('phoneRequired', 30).regex(/^\+?[0-9\s()-]{7,30}$/, say('phoneInvalid')),
  line1: required('line1', 300),
  line2: optional(300),
  city: required('city', 150),
  stateOrProvince: optional(150),
  postalCode: required('postal', 20),
  countryCode: z.string().regex(/^[A-Z]{2}$/, say('country')),
  isDefault: z.boolean(),
});

export type AddressValues = z.infer<typeof addressSchema>;