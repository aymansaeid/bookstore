import { z } from 'zod';

/** SaveAddressDataValidator + Order.Address rules (API §5, §7). */
const required = (message: string, max: number) =>
  z.string().trim().min(1, message).max(max, 'النص أطول من المسموح');
const optional = (max: number) => z.string().trim().max(max, 'النص أطول من المسموح');

export const addressSchema = z.object({
  label: required('اكتب اسماً للعنوان، مثل: المنزل', 50),
  recipientName: required('أدخل اسم المستلم', 200),
  phone: required('أدخل رقم الجوال، فشركات الشحن لا توصل بدونه', 30).regex(
    /^\+?[0-9\s()-]{7,30}$/,
    'رقم الجوال غير صحيح',
  ),
  line1: required('أدخل العنوان', 300),
  line2: optional(300),
  city: required('أدخل المدينة', 150),
  stateOrProvince: optional(150),
  postalCode: required('أدخل الرمز البريدي', 20),
  countryCode: z.string().regex(/^[A-Z]{2}$/, 'اختر البلد'),
  isDefault: z.boolean(),
});

export type AddressValues = z.infer<typeof addressSchema>;
