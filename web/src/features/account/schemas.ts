import { z } from 'zod';

import { isUiLanguage, type UiLanguage } from '@/app/locale';
import { PASSWORD_MAX, PASSWORD_MIN } from '@/features/auth/schemas';
import { i18n } from '@/i18n';
import { formatCount } from '@/shared/lib/format';

/**
 * Messages are looked up when a check fails, so they follow the page's
 * language: the shared ones from common.json, the account ones from
 * account.json (loaded by the page before any form can be submitted).
 */
type CommonKey = 'firstName' | 'lastName' | 'nameTooLong' | 'phone' | 'passwordMax' | 'mismatch';
const common = (key: CommonKey) => ({ error: () => i18n.t(`validation.${key}`) });
const own = (key: 'currentRequired' | 'sameAsCurrent' | 'confirmDelete') => ({
  error: () => i18n.t(`security.validation.${key}`, { ns: 'account' }),
});

/** UpdateCustomerProfileCommandValidator (API §7). */
export const profileSchema = z.object({
  firstName: z.string().trim().min(1, common('firstName')).max(100, common('nameTooLong')),
  lastName: z.string().trim().min(1, common('lastName')).max(100, common('nameTooLong')),
  phone: z
    .string()
    .trim()
    .regex(/^$|^\+?[0-9\s()-]{7,30}$/, common('phone')),
  acceptsMarketingEmails: z.boolean(),
  /** API §2b: the language of order and account emails. */
  preferredLanguage: z.custom<UiLanguage>(isUiLanguage),
});
export type ProfileValues = z.infer<typeof profileSchema>;

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, own('currentRequired')),
    newPassword: z
      .string()
      .min(PASSWORD_MIN, {
        error: () => i18n.t('validation.passwordMin', { n: formatCount(PASSWORD_MIN) }),
      })
      .max(PASSWORD_MAX, common('passwordMax')),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    ...common('mismatch'),
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ['newPassword'],
    ...own('sameAsCurrent'),
  });
export type PasswordValues = z.infer<typeof passwordSchema>;

export const deleteSchema = z.object({
  password: z.string().min(1, { error: () => i18n.t('validation.passwordRequired') }),
  confirm: z.boolean().refine((value) => value, own('confirmDelete')),
});
export type DeleteValues = z.infer<typeof deleteSchema>;