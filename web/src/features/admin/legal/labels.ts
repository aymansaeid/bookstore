import type { PublicLegalType } from '@/features/legal/api';
import type { Tone } from '@/shared/api/enums';

import type { LegalLanguage, LegalStatus } from './api';

/** Same names and slugs as the public pages (features/legal). */
export const LEGAL_TYPES: { type: PublicLegalType; label: string; slug: string }[] = [
  { type: 'DistanceSalesContract', label: 'عقد البيع عن بُعد', slug: 'distance-sales-contract' },
  { type: 'PreInformationForm', label: 'نموذج المعلومات المسبقة', slug: 'pre-information-form' },
  { type: 'PrivacyNotice', label: 'سياسة الخصوصية', slug: 'privacy' },
  { type: 'TermsOfUse', label: 'شروط الاستخدام', slug: 'terms' },
];

export const LEGAL_LANGUAGES: { code: LegalLanguage; label: string }[] = [
  { code: 'ar', label: 'العربية' },
  { code: 'tr', label: 'التركية' },
  { code: 'en', label: 'الإنجليزية' },
];

export const LEGAL_STATUS: Readonly<Record<LegalStatus, { label: string; tone: Tone }>> = {
  Draft: { label: 'مسودة', tone: 'gold' },
  Published: { label: 'منشورة', tone: 'green' },
  Archived: { label: 'مؤرشفة', tone: 'gray' },
};

/** Arabic for the server's placeholder list; unknown names keep the English description. */
export const PLACEHOLDER_LABELS: Readonly<Record<string, string>> = {
  SellerName: 'الاسم التجاري المسجّل',
  SellerAddress: 'العنوان المسجّل',
  SellerPhone: 'هاتف البائع',
  SellerEmail: 'بريد البائع',
  SellerKep: 'عنوان KEP',
  SellerTaxOffice: 'دائرة الضرائب',
  SellerTaxNumber: 'الرقم الضريبي',
  SellerMersis: 'رقم MERSİS',
  OrderNumber: 'رقم الطلب',
  OrderDate: 'تاريخ الطلب ووقته',
  CustomerName: 'اسم المشتري',
  CustomerEmail: 'بريد المشتري',
  CustomerPhone: 'هاتف المشتري',
  DeliveryAddress: 'عنوان التوصيل كاملاً',
  ShippingMethod: 'طريقة الشحن',
  ItemsTable: 'جدول الكتب: العنوان والكمية والسعر',
  Subtotal: 'مجموع الكتب قبل الخصم',
  Discount: 'خصم الكوبون',
  Shipping: 'تكلفة الشحن',
  GiftWrap: 'رسوم التغليف',
  Total: 'الإجمالي المستحق',
  WithdrawalDays: 'مدة حق الرجوع بالأيام',
};

/** {{ Name }} references in a template, in order of first use. */
export function placeholdersIn(markdown: string): string[] {
  const names = [...markdown.matchAll(/\{\{\s*([A-Za-z]+)\s*\}\}/g)].map((match) => match[1] ?? '');
  return [...new Set(names)].filter((name) => name !== '');
}

/** Newest first within: published, then drafts, then archived. */
export const statusRank: Readonly<Record<LegalStatus, number>> = {
  Published: 0,
  Draft: 1,
  Archived: 2,
};