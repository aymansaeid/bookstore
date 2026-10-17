import type { UiLanguage } from '@/app/locale';
import { legalSlugs } from '@/app/legal';
import { apiRequest } from '@/shared/api/http';

export type PublicLegalType =
  'DistanceSalesContract' | 'PreInformationForm' | 'PrivacyNotice' | 'TermsOfUse';

/** API §5c GET /api/legal/{type}: the live text, order fields shown as «—». */
export interface PublishedLegalDocument {
  type: PublicLegalType;
  language: string;
  version: string;
  title: string;
  html: string;
  publishedAtUtc: string;
}

/** URL slug (/legal/…) → API document type. */
export const LEGAL_TYPE_BY_SLUG: Readonly<Record<string, PublicLegalType>> = {
  [legalSlugs.privacy]: 'PrivacyNotice',
  [legalSlugs.terms]: 'TermsOfUse',
  [legalSlugs.distanceSales]: 'DistanceSalesContract',
  [legalSlugs.preInformation]: 'PreInformationForm',
};

export const LEGAL_LINKS: { slug: string; label: string }[] = [
  { slug: legalSlugs.distanceSales, label: 'عقد البيع عن بُعد' },
  { slug: legalSlugs.preInformation, label: 'نموذج المعلومات المسبقة' },
  { slug: legalSlugs.privacy, label: 'سياسة الخصوصية' },
  { slug: legalSlugs.terms, label: 'شروط الاستخدام' },
];

export const legalApi = {
  /** 404 when nothing is published for that type and language yet. */
  get: (type: PublicLegalType, language: UiLanguage) =>
    apiRequest<PublishedLegalDocument>(`/api/legal/${type}`, { query: { lang: language } }),
};
