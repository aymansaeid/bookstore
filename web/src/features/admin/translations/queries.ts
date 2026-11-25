import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAdminSession } from '../session';

import { type TranslatableKind, translationsApi } from './api';

export const translationKeys = {
  item: (kind: TranslatableKind, id: number) => ['admin', kind, 'translations', id] as const,
};

/** GET …/translations: the Arabic source, every translation, what's missing. */
export function useTranslations<T>(kind: TranslatableKind, id: number) {
  const { status } = useAdminSession();
  return useQuery({
    queryKey: translationKeys.item(kind, id),
    queryFn: ({ signal }) => translationsApi.get<T>(kind, id, signal),
    enabled: status === 'signedIn' && id > 0,
  });
}

/** Storefront caches that show translated text, per kind. */
const PUBLIC_KEYS: Record<TranslatableKind, string[][]> = {
  categories: [['catalog']],
  muhaqqiqs: [['catalog'], ['muhaqqiqs']],
  'reading-paths': [['reading-paths'], ['me', 'paths']],
  'shipping-zones': [['store'], ['shipping'], ['quote']],
};

/** After a save or delete: this item's translations, the admin list's flags, the storefront. */
export function useRefreshTranslations(kind: TranslatableKind, id: number) {
  const queryClient = useQueryClient();
  return () => {
    // The admin list (['admin', kind]) carries the flags; this item's translations sit under it.
    void queryClient.invalidateQueries({ queryKey: ['admin', kind] });
    void queryClient.invalidateQueries({ queryKey: translationKeys.item(kind, id) });
    for (const key of PUBLIC_KEYS[kind]) void queryClient.invalidateQueries({ queryKey: key });
  };
}