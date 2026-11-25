import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/shared/api/ApiError';
import { errorMessage } from '@/shared/api/errorMessages';
import { toast } from '@/shared/ui/toast/toastStore';

import { adminRequest, useAdminSession } from '../session';

import type { AdminBook } from './api';
import { adminBookKeys } from './queries';

/** Arabic is edited on the book itself; these are the translation languages (API §2b). */
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

export const isTranslationLanguage = (value: unknown): value is TranslationLanguage =>
  value === 'en' || value === 'tr';

/** BookTranslationDto */
export interface BookTranslation {
  language: TranslationLanguage;
  title: string;
  subtitle: string | null;
  author: string | null;
  description: string | null;
  editionLabel: string | null;
  highlights: string[];
  updatedAtUtc: string;
}

/** PUT body: a full replacement; blank fields fall back to Arabic on the storefront. */
export interface BookTranslationInput {
  title: string;
  subtitle: string | null;
  author: string | null;
  description: string | null;
  editionLabel: string | null;
  highlights: string[];
}

/** AdminBookTranslationsDto: the Arabic shown beside the form, every translation, what's missing. */
export interface BookTranslations {
  bookId: number;
  transliteratedTitle: string | null;
  source: {
    title: string;
    subtitle: string | null;
    author: string;
    description: string;
    editionLabel: string | null;
    highlights: string[];
  };
  translations: BookTranslation[];
  missing: TranslationLanguage[];
}

/** Same limits as BookTranslation.cs / Book.cs. */
export const TRANSLATION_LIMITS = {
  title: 500,
  subtitle: 500,
  author: 300,
  description: 4000,
  editionLabel: 100,
  highlights: 12,
  highlight: 200,
  transliteration: 500,
} as const;

const base = (id: number) => `/api/admin/books/${String(id)}`;

export const bookTranslationsApi = {
  all: (id: number, signal?: AbortSignal) =>
    adminRequest<BookTranslations>(`${base(id)}/translations`, { signal }),
  save: (id: number, language: TranslationLanguage, body: BookTranslationInput) =>
    adminRequest<BookTranslation>(`${base(id)}/translations/${language}`, {
      method: 'PUT',
      body,
    }),
  remove: (id: number, language: TranslationLanguage) =>
    adminRequest<undefined>(`${base(id)}/translations/${language}`, { method: 'DELETE' }),
  /** Latin spelling of the Arabic title, searched in every language. Null clears it. */
  setTransliteration: (id: number, transliteratedTitle: string | null) =>
    adminRequest<AdminBook>(`${base(id)}/transliteration`, {
      method: 'PUT',
      body: { transliteratedTitle },
    }),
};

export const translationKeys = {
  book: (id: number) => ['admin', 'books', 'translations', id] as const,
};

export function useBookTranslations(id: number) {
  const { status } = useAdminSession();
  return useQuery({
    queryKey: translationKeys.book(id),
    queryFn: ({ signal }) => bookTranslationsApi.all(id, signal),
    enabled: status === 'signedIn' && id > 0,
  });
}

/** The book, the list's `translations` flags and the storefront all change with a translation. */
function useRefreshAfterTranslation(id: number) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: adminBookKeys.detail(id) });
    void queryClient.invalidateQueries({ queryKey: adminBookKeys.list });
    void queryClient.invalidateQueries({ queryKey: ['book'] });
    void queryClient.invalidateQueries({ queryKey: ['catalog'] });
  };
}

function reportError(error: Error) {
  if (!(error instanceof ApiError && error.code === 'Validation')) toast.error(errorMessage(error));
}

export function useSaveTranslation(id: number, language: TranslationLanguage) {
  const queryClient = useQueryClient();
  const refresh = useRefreshAfterTranslation(id);
  return useMutation({
    mutationFn: (body: BookTranslationInput) => bookTranslationsApi.save(id, language, body),
    onSuccess: (saved) => {
      queryClient.setQueryData<BookTranslations>(translationKeys.book(id), (old) =>
        old
          ? {
              ...old,
              translations: [...old.translations.filter((t) => t.language !== language), saved],
              missing: old.missing.filter((code) => code !== language),
            }
          : old,
      );
      refresh();
    },
    onError: reportError,
  });
}

export function useDeleteTranslation(id: number, language: TranslationLanguage) {
  const queryClient = useQueryClient();
  const refresh = useRefreshAfterTranslation(id);
  return useMutation({
    mutationFn: () => bookTranslationsApi.remove(id, language),
    onSuccess: () => {
      queryClient.setQueryData<BookTranslations>(translationKeys.book(id), (old) =>
        old
          ? {
              ...old,
              translations: old.translations.filter((t) => t.language !== language),
              missing: old.missing.includes(language) ? old.missing : [...old.missing, language],
            }
          : old,
      );
      refresh();
      toast.success('حُذفت الترجمة. ستظهر النصوص العربية مكانها.');
    },
    onError: reportError,
  });
}

export function useSetTransliteration(id: number) {
  const queryClient = useQueryClient();
  const refresh = useRefreshAfterTranslation(id);
  return useMutation({
    mutationFn: (value: string | null) => bookTranslationsApi.setTransliteration(id, value),
    onSuccess: (book) => {
      queryClient.setQueryData(adminBookKeys.detail(id), book);
      queryClient.setQueryData<BookTranslations>(translationKeys.book(id), (old) =>
        old ? { ...old, transliteratedTitle: book.transliteratedTitle } : old,
      );
      refresh();
      toast.success('حُفظ العنوان بالحروف اللاتينية.');
    },
    onError: reportError,
  });
}