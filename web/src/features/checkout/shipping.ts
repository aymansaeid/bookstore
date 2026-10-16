import type { ShippingOption } from './types';

export const PICKUP_METHOD = 'pickup';

/** Display name for a quote shipping option; "standard" arrives with name null (§5b). */
export function shippingOptionName(option: ShippingOption): string {
  if (option.name) return option.name;
  if (option.code === 'standard') return 'الشحن العادي';
  if (option.isPickup) return 'الاستلام من المكتبة';
  return option.code;
}
