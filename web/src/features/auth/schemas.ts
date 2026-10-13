import { z } from 'zod';

import { formatCount } from '@/shared/lib/format';

/** API guide §3: 12–128 characters, no composition rules. */
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

const email = z.email('أدخل بريداً إلكترونياً صحيحاً');

const newPassword = z
  .string()
  .min(PASSWORD_MIN, `كلمة المرور ${formatCount(PASSWORD_MIN)} حرفاً على الأقل`)
  .max(PASSWORD_MAX, 'كلمة المرور أطول من المسموح');

// Login doesn't enforce the minimum: only the server knows if the password is right.
export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'أدخل كلمة المرور'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'أدخل الاسم').max(100, 'الاسم أطول من المسموح'),
  lastName: z.string().trim().min(1, 'أدخل اسم العائلة').max(100, 'الاسم أطول من المسموح'),
  email,
  phone: z
    .string()
    .trim()
    .regex(/^$|^\+?[0-9\s()-]{7,20}$/, 'رقم الجوال غير صحيح'),
  password: newPassword,
  readingLevel: z.enum(['Beginner', 'Intermediate', 'Specialist']).nullable(),
  interestCategoryIds: z.array(z.number()).max(10, `اختر ${formatCount(10)} اهتمامات كحدٍّ أقصى`),
  acceptsMarketingEmails: z.boolean(),
});
export type RegisterValues = z.infer<typeof registerSchema>;

export const emailOnlySchema = z.object({ email });
export type EmailOnlyValues = z.infer<typeof emailOnlySchema>;

export const resetPasswordSchema = z
  .object({ newPassword, confirmPassword: z.string() })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    error: 'كلمتا المرور غير متطابقتين',
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/** For register({ setValueAs }) on email inputs. */
export const trimValue = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;
