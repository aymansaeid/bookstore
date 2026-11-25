import { z } from 'zod';

import { i18n } from '@/i18n';
import { formatCount } from '@/shared/lib/format';

/** API guide §3: 12–128 characters, no composition rules. */
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

type MessageKey =
  | 'email'
  | 'passwordMax'
  | 'passwordRequired'
  | 'firstName'
  | 'lastName'
  | 'nameTooLong'
  | 'phone'
  | 'mismatch';

/**
 * Looked up when a check fails, so messages follow the page's language. In
 * common.json: the email schema is used on book pages too, not only sign-in.
 */
const say = (key: MessageKey) => ({
  error: () => i18n.t(`validation.${key}`),
});

const email = z.email(say('email'));

const newPassword = z
  .string()
  .min(PASSWORD_MIN, {
    error: () => i18n.t('validation.passwordMin', { n: formatCount(PASSWORD_MIN) }),
  })
  .max(PASSWORD_MAX, say('passwordMax'));

// Login doesn't enforce the minimum: only the server knows if the password is right.
export const loginSchema = z.object({
  email,
  password: z.string().min(1, say('passwordRequired')),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, say('firstName')).max(100, say('nameTooLong')),
  lastName: z.string().trim().min(1, say('lastName')).max(100, say('nameTooLong')),
  email,
  phone: z
    .string()
    .trim()
    .regex(/^$|^\+?[0-9\s()-]{7,20}$/, say('phone')),
  password: newPassword,
  readingLevel: z.enum(['Beginner', 'Intermediate', 'Specialist']).nullable(),
  interestCategoryIds: z
    .array(z.number())
    .max(10, { error: () => i18n.t('validation.interests', { n: formatCount(10) }) }),
  acceptsMarketingEmails: z.boolean(),
});
export type RegisterValues = z.infer<typeof registerSchema>;

export const emailOnlySchema = z.object({ email });
export type EmailOnlyValues = z.infer<typeof emailOnlySchema>;

export const resetPasswordSchema = z
  .object({ newPassword, confirmPassword: z.string() })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    ...say('mismatch'),
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/** For register({ setValueAs }) on email inputs. */
export const trimValue = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;