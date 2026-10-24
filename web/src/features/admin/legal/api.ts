import type { PublicLegalType } from '@/features/legal/api';

import { adminRequest } from '../session';

export type LegalStatus = 'Draft' | 'Published' | 'Archived';
export type LegalLanguage = 'ar' | 'tr' | 'en';

/** API §10 AdminLegalDocumentDto: one version of one document in one language. */
export interface AdminLegalDocument {
  id: number;
  type: PublicLegalType;
  language: LegalLanguage;
  /** Free text; shown to buyers and stored with every order. */
  version: string;
  title: string;
  bodyMarkdown: string;
  status: LegalStatus;
  createdAtUtc: string;
  publishedAtUtc: string | null;
  archivedAtUtc: string | null;
  /** {{Names}} in the text the server doesn't know. Publishing is refused while any remain. */
  unknownPlaceholders: string[];
}

export interface NewLegalDraft {
  type: PublicLegalType;
  language: LegalLanguage;
  version: string;
  title: string;
  bodyMarkdown: string;
}

export const LEGAL_LIMITS = { title: 200, version: 50, body: 100_000 } as const;

const BASE = '/api/admin/legal';
const one = (id: number) => `${BASE}/${String(id)}`;

export const adminLegalApi = {
  list: (type: PublicLegalType, language: LegalLanguage, signal?: AbortSignal) =>
    adminRequest<AdminLegalDocument[]>(BASE, { query: { type, lang: language }, signal }),
  /** Name → English description of every {{placeholder}} a template may use. */
  placeholders: (signal?: AbortSignal) =>
    adminRequest<Record<string, string>>(`${BASE}/placeholders`, { signal }),
  create: (body: NewLegalDraft) => adminRequest<AdminLegalDocument>(BASE, { method: 'POST', body }),
  /** Drafts only: published and archived versions are frozen. */
  update: (id: number, body: { title: string; bodyMarkdown: string }) =>
    adminRequest<AdminLegalDocument>(one(id), { method: 'PUT', body }),
  /** Makes the draft live and archives the version it replaces. */
  publish: (id: number) =>
    adminRequest<AdminLegalDocument>(`${one(id)}/publish`, { method: 'POST' }),
};