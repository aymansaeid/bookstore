import { adminRequest } from '../session';

/** Arabic is edited on the item itself; these are the translation languages (API §2b). */
export type TranslationLanguage = 'en' | 'tr';

export const TRANSLATION_LANGUAGES: {
  code: TranslationLanguage;
  /** In the admin's Arabic. */
  label: string;
  /** On the tab, in its own script. */
  native: string;
}[] = [
  { code: 'en', label: 'الإنجليزية', native: 'English' },
  { code: 'tr', label: 'التركية', native: 'Türkçe' },
];

/** Admin lists carry the languages each item has, e.g. ['en']. */
export type TranslationFlags = TranslationLanguage[];

// ---------- Categories ----------

export interface CategoryTranslation {
  language: TranslationLanguage;
  name: string;
  description: string | null;
  updatedAtUtc: string;
}

export interface CategoryTranslations {
  categoryId: number;
  sourceName: string;
  sourceDescription: string | null;
  translations: CategoryTranslation[];
  missing: TranslationLanguage[];
}

// ---------- Muhaqqiqs ----------

export interface MuhaqqiqTranslation {
  language: TranslationLanguage;
  name: string;
  bio: string | null;
  specialties: string[];
  updatedAtUtc: string;
}

export interface MuhaqqiqTranslations {
  muhaqqiqId: number;
  sourceName: string;
  sourceBio: string | null;
  sourceSpecialties: string[];
  translations: MuhaqqiqTranslation[];
  missing: TranslationLanguage[];
}

// ---------- Reading paths ----------

export interface StageTranslation {
  stageNumber: number;
  bookId: number;
  sourceReason: string;
  /** null: the Arabic reason shows. */
  reason: string | null;
}

export interface ReadingPathTranslation {
  language: TranslationLanguage;
  title: string;
  description: string | null;
  stages: StageTranslation[];
  updatedAtUtc: string;
}

export interface ReadingPathTranslations {
  readingPathId: number;
  sourceTitle: string;
  sourceDescription: string | null;
  translations: ReadingPathTranslation[];
  missing: TranslationLanguage[];
}

// ---------- Shipping zones (the paid extras' names) ----------

export interface ShippingZoneTranslation {
  language: TranslationLanguage;
  options: { code: string; sourceName: string; name: string | null }[];
}

export interface ShippingZoneTranslations {
  zoneId: number;
  translations: ShippingZoneTranslation[];
  /** Languages where every extra has a name. */
  complete: TranslationLanguage[];
  missing: TranslationLanguage[];
}

/** Same limits as the API's Category, Muhaqqiq, ReadingPath and ShippingZone. */
export const TRANSLATION_LIMITS = {
  categoryName: 100,
  categoryDescription: 500,
  muhaqqiqName: 200,
  bio: 2000,
  specialties: 10,
  specialty: 50,
  pathTitle: 200,
  pathDescription: 1000,
  reason: 300,
  optionName: 100,
} as const;

/** The admin collections that have translations. */
export type TranslatableKind = 'categories' | 'muhaqqiqs' | 'reading-paths' | 'shipping-zones';

const url = (kind: TranslatableKind, id: number, language?: TranslationLanguage) =>
  `/api/admin/${kind}/${String(id)}/translations${language ? `/${language}` : ''}`;

export const translationsApi = {
  get: <T>(kind: TranslatableKind, id: number, signal?: AbortSignal) =>
    adminRequest<T>(url(kind, id), { signal }),
  /** A full replacement for that language; blank fields fall back to Arabic. */
  put: (kind: TranslatableKind, id: number, language: TranslationLanguage, body: object) =>
    adminRequest<unknown>(url(kind, id, language), { method: 'PUT', body }),
  remove: (kind: TranslatableKind, id: number, language: TranslationLanguage) =>
    adminRequest<undefined>(url(kind, id, language), { method: 'DELETE' }),
};