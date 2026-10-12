import { ApiError } from './ApiError';

/**
 * API guide §2: validation keys are C# paths ("ShippingAddress.Phone",
 * "Lines[0].Quantity", "$.lines"). Converts them to form paths
 * ("shippingAddress.phone", "lines.0.quantity", "lines").
 */
export function toFormPath(key: string): string {
  return key
    .replace(/^\$\.?/, '')
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toLowerCase() + segment.slice(1))
    .join('.');
}

/**
 * Server field errors keyed by form path. Server messages are English, so
 * each field gets an Arabic prompt; the forms' own Arabic validation
 * normally catches problems first.
 */
export function serverFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || error.code !== 'Validation') return {};
  const result: Record<string, string> = {};
  for (const key of Object.keys(error.fieldErrors)) {
    const path = toFormPath(key);
    if (path) result[path] = 'تحقّق من قيمة هذا الحقل.';
  }
  return result;
}
