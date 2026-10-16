import { zodResolver } from '@hookform/resolvers/zod';
import type { Resolver } from 'react-hook-form';
import { z } from 'zod';

import { formatCount } from '@/shared/lib/format';

/** Server limits (CheckoutCartCommandValidator, API §5). */
export const GIFT_MESSAGE_MAX = 300;

const tooLong = 'النص أطول من المسموح';
const field = (max: number) => z.string().trim().max(max, tooLong);

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
    .max(GIFT_MESSAGE_MAX, `رسالة الإهداء ${formatCount(GIFT_MESSAGE_MAX)} حرف كحدٍّ أقصى`),
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
    const fail = (path: keyof CheckoutValues, message: string) => {
      ctx.addIssue({ code: 'custom', path: [path], message });
    };
    const required = (path: keyof CheckoutValues, message: string) => {
      if (values[path] === '') fail(path, message);
    };

    if (rules.guest) {
      if (values.email === '') fail('email', 'أدخل بريدك الإلكتروني ليصلك تأكيد الطلب');
      else if (!emailFormat.safeParse(values.email).success) {
        fail('email', 'أدخل بريداً إلكترونياً صحيحاً');
      }
    }
    if (rules.savedAddress) return;

    required('recipientName', 'أدخل اسم المستلم');
    if (values.phone === '') fail('phone', 'أدخل رقم الجوال، فشركات الشحن لا توصل بدونه');
    else if (!PHONE.test(values.phone)) fail('phone', 'رقم الجوال غير صحيح');
    if (rules.pickup) return;

    required('line1', 'أدخل العنوان');
    required('city', 'أدخل المدينة');
    required('postalCode', 'أدخل الرمز البريدي');
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
