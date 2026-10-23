import { z } from 'zod';

import { formatCount } from '@/shared/lib/format';

import {
  type AdminShippingZone,
  type DeliveryInput,
  SHIPPING_LIMITS as L,
  type ZoneInput,
} from './api';

const tooLong = 'النص أطول من المسموح';
const money = /^\d+(\.\d{1,2})?$/;
const daysText = z
  .string()
  .trim()
  .regex(/^\d*$/, 'أدخل رقماً صحيحاً')
  .refine((value) => value === '' || Number(value) <= L.maxDays, {
    message: `حتى ${formatCount(L.maxDays)} يوماً`,
  });

/** «Both or neither, and min ≤ max» for a pair of day fields, reported on the max field. */
function checkDays(
  min: string,
  max: string,
  ctx: z.RefinementCtx,
  path: (string | number)[],
): void {
  if ((min === '') !== (max === '')) {
    ctx.addIssue({ code: 'custom', message: 'أدخل الأقل والأكثر معاً، أو اتركهما فارغين', path });
  } else if (min !== '' && Number(min) > Number(max)) {
    ctx.addIssue({ code: 'custom', message: 'الأكثر يجب ألا يقل عن الأقل', path });
  }
}

/* ---------- Zone ---------- */

export const zoneSchema = z.object({
  name: z.string().trim().min(1, 'أدخل اسم المنطقة').max(L.name, tooLong),
  flatRate: z.string().trim().regex(money, 'أدخل سعراً مثل 450 أو 450.50، أو 0 للشحن المجاني'),
  countryCodes: z.array(z.string()).min(1, 'أضف دولة واحدة على الأقل'),
});

export type ZoneValues = z.infer<typeof zoneSchema>;

export const zoneValues = (zone: AdminShippingZone | null): ZoneValues => ({
  name: zone?.name ?? '',
  flatRate: zone ? String(zone.flatRate) : '',
  countryCodes: zone?.countryCodes ?? [],
});

export const zoneInput = (values: ZoneValues): ZoneInput => ({
  name: values.name.trim(),
  flatRate: Number(values.flatRate),
  countryCodes: values.countryCodes,
});

/* ---------- Delivery ---------- */

const optionSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]{2,30}$/, 'من ٢ إلى ٣٠ حرفاً لاتينياً صغيراً أو رقماً أو -')
      .refine((code) => !(L.reservedCodes as readonly string[]).includes(code), {
        message: 'هذا الرمز محجوز للنظام',
      }),
    name: z.string().trim().min(1, 'أدخل اسم الخيار').max(L.optionName, tooLong),
    carrier: z.string().trim().max(L.carrier, tooLong),
    price: z.string().trim().regex(money, 'أدخل سعراً مثل 250'),
    minDays: daysText,
    maxDays: daysText,
  })
  .superRefine((option, ctx) => {
    checkDays(option.minDays, option.maxDays, ctx, ['maxDays']);
  });

export const deliverySchema = z
  .object({
    standardCarrier: z.string().trim().max(L.carrier, tooLong),
    standardMinDays: daysText,
    standardMaxDays: daysText,
    /** '' = no free shipping. */
    freeShippingThreshold: z
      .string()
      .trim()
      .refine((value) => value === '' || (money.test(value) && Number(value) > 0), {
        message: 'أدخل مبلغاً أكبر من صفر، أو اتركه فارغاً',
      }),
    options: z.array(optionSchema).max(L.maxOptions, `حتى ${formatCount(L.maxOptions)} خيارات`),
  })
  .superRefine((values, ctx) => {
    checkDays(values.standardMinDays, values.standardMaxDays, ctx, ['standardMaxDays']);
    const seen = new Set<string>();
    values.options.forEach((option, index) => {
      if (seen.has(option.code)) {
        ctx.addIssue({
          code: 'custom',
          message: 'الرمز مستخدم لخيار آخر',
          path: ['options', index, 'code'],
        });
      }
      seen.add(option.code);
    });
  });

export type DeliveryValues = z.infer<typeof deliverySchema>;
export type OptionValues = DeliveryValues['options'][number];

const text = (value: number | null) => (value === null ? '' : String(value));
const orNull = (value: string) => (value.trim() === '' ? null : value.trim());
const numberOrNull = (value: string) => (value.trim() === '' ? null : Number(value));

export const emptyOption: OptionValues = {
  code: '',
  name: '',
  carrier: '',
  price: '',
  minDays: '',
  maxDays: '',
};

export const deliveryValues = (zone: AdminShippingZone): DeliveryValues => ({
  standardCarrier: zone.standardCarrier ?? '',
  standardMinDays: text(zone.standardMinDays),
  standardMaxDays: text(zone.standardMaxDays),
  freeShippingThreshold: text(zone.freeShippingThreshold),
  options: zone.options.map((option) => ({
    code: option.code,
    name: option.name,
    carrier: option.carrier ?? '',
    price: String(option.price),
    minDays: text(option.minDays),
    maxDays: text(option.maxDays),
  })),
});

export const deliveryInput = (values: DeliveryValues): DeliveryInput => ({
  standardCarrier: orNull(values.standardCarrier),
  standardMinDays: numberOrNull(values.standardMinDays),
  standardMaxDays: numberOrNull(values.standardMaxDays),
  freeShippingThreshold: numberOrNull(values.freeShippingThreshold),
  options: values.options.map((option) => ({
    code: option.code.trim(),
    name: option.name.trim(),
    carrier: orNull(option.carrier),
    price: Number(option.price),
    minDays: numberOrNull(option.minDays),
    maxDays: numberOrNull(option.maxDays),
  })),
});