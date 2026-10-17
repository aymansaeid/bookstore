import { z } from 'zod';

import { PASSWORD_MAX, PASSWORD_MIN } from '@/features/auth/schemas';
import { formatCount } from '@/shared/lib/format';

/** UpdateCustomerProfileCommandValidator (API §7). */
export const profileSchema = z.object({
  firstName: z.string().trim().min(1, 'أدخل الاسم').max(100, 'الاسم أطول من المسموح'),
  lastName: z.string().trim().min(1, 'أدخل اسم العائلة').max(100, 'الاسم أطول من المسموح'),
  phone: z
    .string()
    .trim()
    .regex(/^$|^\+?[0-9\s()-]{7,30}$/, 'رقم الجوال غير صحيح'),
  acceptsMarketingEmails: z.boolean(),
});
export type ProfileValues = z.infer<typeof profileSchema>;

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'أدخل كلمة المرور الحالية'),
    newPassword: z
      .string()
      .min(PASSWORD_MIN, `كلمة المرور ${formatCount(PASSWORD_MIN)} حرفاً على الأقل`)
      .max(PASSWORD_MAX, 'كلمة المرور أطول من المسموح'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    error: 'كلمتا المرور غير متطابقتين',
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ['newPassword'],
    error: 'اختر كلمة مرور مختلفة عن الحالية',
  });
export type PasswordValues = z.infer<typeof passwordSchema>;

export const deleteSchema = z.object({
  password: z.string().min(1, 'أدخل كلمة المرور'),
  confirm: z.boolean().refine((value) => value, { error: 'أكّد أنك تفهم أن الحذف نهائي' }),
});
export type DeleteValues = z.infer<typeof deleteSchema>;
