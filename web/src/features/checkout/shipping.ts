import { i18n } from '@/i18n';

import type { ShippingOption } from './types';

export const PICKUP_METHOD = 'pickup';

/** Display name for a quote shipping option; "standard" arrives with name null (§5b). */
export function shippingOptionName(option: ShippingOption): string {
  if (option.name) return option.name;
  if (option.code === 'standard') return i18n.t('shipping.standard', { ns: 'checkout' });
  if (option.isPickup) return i18n.t('shipping.pickup', { ns: 'checkout' });
  return option.code;
}