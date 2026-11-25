import { zodResolver } from '@hookform/resolvers/zod';
import type { Resolver } from 'react-hook-form';
import { z } from 'zod';

import { i18n } from '@/i18n';
import { formatCount } from '@/shared/lib/format';

/** Server limits (CheckoutCartCommandValidator, API §5). */
export const GIFT_MESSAGE_MAX = 300;

/** Looked up when validation runs, so messages follow the page's language. */
type FormKey =
  | 'tooLong'
  | 'emailRequired'
  | 'emailInvalid'
  | 'nameRequired'
  | 'phoneRequired'
  | 'phoneInvalid'
  | 'line1Required'
  | 'cityRequired'
  | 'postalRequired';
const say = (key: FormKey) => i18n.t(`form.${key}`, { ns: 'checkout' });

const field = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: () => say('tooLong') });

const checkoutBase = z.object({
  email: field(320),
  recipientName: field(200),
  phone: field(30),
  line1: field(300),
  line2: field(300),
  city: field(150),
  stateOrProvince: field(150),
  postalCode: field(20),
  giftMessage: z
    .string()
    .trim()
    .max(GIFT_MESSAGE_MAX, {
      error: () =>
        i18n.t('form.giftTooLong', { ns: 'checkout', n: formatCount(GIFT_MESSAGE_MAX) }),
    }),
});

export type CheckoutValues = z.infer<typeof checkoutBase>;

/** Which fields are required depends on the session and the choices made. */
export interface CheckoutRules {
  /** Guests type their email; signed-in customers use the account's. */
  guest: boolean;
  /** A saved address replaces every address field. */
  savedAddress: boolean;
  /** Store pickup needs only the name and phone (§5b). */
  pickup: boolean;
}

const emailFormat = z.email();
const PHONE = /^\+?[0-9\s()-]{7,30}$/;

export function checkoutSchema(rules: CheckoutRules) {
  return checkoutBase.superRefine((values, ctx) => {
    const fail = (path: keyof CheckoutValues, key: FormKey) => {
      ctx.addIssue({ code: 'custom', path: [path], message: say(key) });
    };
    const required = (path: keyof CheckoutValues, key: FormKey) => {
      if (values[path] === '') fail(path, key);
    };

    if (rules.guest) {
      if (values.email === '') fail('email', 'emailRequired');
      else if (!emailFormat.safeParse(values.email).success) fail('email', 'emailInvalid');
    }
    if (rules.savedAddress) return;

    required('recipientName', 'nameRequired');
    if (values.phone === '') fail('phone', 'phoneRequired');
    else if (!PHONE.test(values.phone)) fail('phone', 'phoneInvalid');
    if (rules.pickup) return;

    required('line1', 'line1Required');
    required('city', 'cityRequired');
    required('postalCode', 'postalRequired');
  });
}

/**
 * The rules are read when validation runs, never captured at render, so a
 * change of shipping method or address takes effect on the next submit.
 */
export function checkoutResolver(getRules: () => CheckoutRules): Resolver<CheckoutValues> {
  return (values, context, options) =>
    zodResolver(checkoutSchema(getRules()))(values, context, options);
}