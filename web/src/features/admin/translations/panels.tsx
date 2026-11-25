import type { AdminCategory, AdminMuhaqqiq } from '@/features/admin/catalog/api';
import type { AdminReadingPath } from '@/features/admin/paths/api';
import type { AdminShippingZone } from '@/features/admin/shipping/api';
import { formatCount } from '@/shared/lib/format';

import {
  type CategoryTranslations as CategoryData,
  type MuhaqqiqTranslations as MuhaqqiqData,
  type ReadingPathTranslations as PathData,
  type ShippingZoneTranslations as ZoneData,
  type TranslatableKind,
  type TranslationLanguage,
  TRANSLATION_LIMITS as LIMITS,
  translationsApi,
} from './api';
import { useRefreshTranslations, useTranslations } from './queries';
import {
  PanelNote,
  PanelState,
  type SavedTranslation,
  type TranslationField,
  TranslationPanel,
  type TranslationValues,
} from './TranslationPanel';
import { orNull, splitLines } from './values';

type Saved = Partial<Record<TranslationLanguage, SavedTranslation>>;

interface PanelProps {
  onDirtyChange?: (dirty: boolean) => void;
}

/** Shared wiring: load, save (PUT), delete, refresh. */
function usePanel<T>(kind: TranslatableKind, id: number) {
  const query = useTranslations<T>(kind, id);
  const refresh = useRefreshTranslations(kind, id);
  return {
    query,
    remove: (language: TranslationLanguage) => translationsApi.remove(kind, id, language),
    put: (language: TranslationLanguage, body: object) =>
      translationsApi.put(kind, id, language, body),
    refresh,
  };
}

// ---------- Category ----------

export function CategoryTranslations({
  category,
  onDirtyChange,
}: PanelProps & { category: AdminCategory }) {
  const { query, put, remove, refresh } = usePanel<CategoryData>('categories', category.id);
  const data = query.data;
  if (!data) return <PanelState error={query.error} onRetry={() => void query.refetch()} />;

  const fields: TranslationField[] = [
    {
      key: 'name',
      label: 'الاسم',
      kind: 'text',
      max: LIMITS.categoryName,
      required: true,
      source: data.sourceName,
    },
    {
      key: 'description',
      label: 'الوصف (اختياري)',
      kind: 'textarea',
      max: LIMITS.categoryDescription,
      source: data.sourceDescription,
    },
  ];
  const saved: Saved = Object.fromEntries(
    data.translations.map((t) => [
      t.language,
      { values: { name: t.name, description: t.description ?? '' }, updatedAtUtc: t.updatedAtUtc },
    ]),
  );

  return (
    <TranslationPanel
      fields={fields}
      saved={saved}
      save={(language, v) =>
        put(language, { name: v.name?.trim() ?? '', description: orNull(v.description) })
      }
      remove={remove}
      onChanged={refresh}
      onDirtyChange={onDirtyChange}
    />
  );
}

// ---------- Muhaqqiq ----------

export function MuhaqqiqTranslations({
  muhaqqiq,
  onDirtyChange,
}: PanelProps & { muhaqqiq: AdminMuhaqqiq }) {
  const { query, put, remove, refresh } = usePanel<MuhaqqiqData>('muhaqqiqs', muhaqqiq.id);
  const data = query.data;
  if (!data) return <PanelState error={query.error} onRetry={() => void query.refetch()} />;

  const fields: TranslationField[] = [
    {
      key: 'name',
      label: 'الاسم',
      kind: 'text',
      max: LIMITS.muhaqqiqName,
      required: true,
      source: data.sourceName,
      hint: 'بالحروف اللاتينية كما يُكتب في تلك اللغة، مثل Shu‘ayb al-Arna’ut.',
    },
    {
      key: 'bio',
      label: 'النبذة (اختياري)',
      kind: 'textarea',
      max: LIMITS.bio,
      rows: 6,
      source: data.sourceBio,
    },
    {
      key: 'specialties',
      label: 'التخصصات',
      kind: 'lines',
      max: LIMITS.specialty,
      maxLines: LIMITS.specialties,
      source: data.sourceSpecialties,
      hint: 'بنفس ترتيب العربية. فارغ: تظهر العربية.',
    },
  ];
  const saved: Saved = Object.fromEntries(
    data.translations.map((t) => [
      t.language,
      {
        values: { name: t.name, bio: t.bio ?? '', specialties: t.specialties.join('\n') },
        updatedAtUtc: t.updatedAtUtc,
      },
    ]),
  );

  return (
    <TranslationPanel
      fields={fields}
      saved={saved}
      save={(language, v) =>
        put(language, {
          name: v.name?.trim() ?? '',
          bio: orNull(v.bio),
          specialties: splitLines(v.specialties ?? ''),
        })
      }
      remove={remove}
      onChanged={refresh}
      onDirtyChange={onDirtyChange}
    />
  );
}

// ---------- Reading path ----------

const stageKey = (bookId: number) => `stage-${String(bookId)}`;

/**
 * Title, description and the «why this book now» of every stage. The stages
 * come from the path itself, so a path not translated yet still lists them.
 */
export function ReadingPathTranslations({
  path,
  bookTitle,
  onDirtyChange,
}: PanelProps & { path: AdminReadingPath; bookTitle: (bookId: number) => string }) {
  const { query, put, remove, refresh } = usePanel<PathData>('reading-paths', path.id);
  const data = query.data;
  if (!data) return <PanelState error={query.error} onRetry={() => void query.refetch()} />;

  const stages = [...path.stages].sort((a, b) => a.stageNumber - b.stageNumber);
  const fields: TranslationField[] = [
    {
      key: 'title',
      label: 'العنوان',
      kind: 'text',
      max: LIMITS.pathTitle,
      required: true,
      source: data.sourceTitle,
    },
    {
      key: 'description',
      label: 'الوصف (اختياري)',
      kind: 'textarea',
      max: LIMITS.pathDescription,
      source: data.sourceDescription,
    },
    ...stages.map((stage): TranslationField => ({
      key: stageKey(stage.bookId),
      label: `المرحلة ${formatCount(stage.stageNumber)}: «${bookTitle(stage.bookId)}»`,
      kind: 'textarea',
      rows: 3,
      max: LIMITS.reason,
      source: stage.reason,
      hint: 'لماذا هذا الكتاب الآن؟ فارغ: يظهر السبب العربي.',
    })),
  ];
  const saved: Saved = Object.fromEntries(
    data.translations.map((t) => [
      t.language,
      {
        values: {
          title: t.title,
          description: t.description ?? '',
          ...Object.fromEntries(t.stages.map((s) => [stageKey(s.bookId), s.reason ?? ''])),
        },
        updatedAtUtc: t.updatedAtUtc,
      },
    ]),
  );

  return (
    <TranslationPanel
      fields={fields}
      saved={saved}
      save={(language, v: TranslationValues) =>
        put(language, {
          title: v.title?.trim() ?? '',
          description: orNull(v.description),
          // A stage left out keeps its Arabic reason.
          stages: stages.flatMap((stage) => {
            const reason = orNull(v[stageKey(stage.bookId)]);
            return reason ? [{ bookId: stage.bookId, reason }] : [];
          }),
        })
      }
      remove={remove}
      onChanged={refresh}
      onDirtyChange={onDirtyChange}
    />
  );
}

// ---------- Shipping zone ----------

/** The names of a zone's paid extras (express…). Standard delivery and pickup are named in config. */
export function ShippingZoneTranslations({
  zone,
  onDirtyChange,
}: PanelProps & { zone: AdminShippingZone }) {
  const { query, put, remove, refresh } = usePanel<ZoneData>('shipping-zones', zone.id);
  if (zone.options.length === 0) {
    return (
      <PanelNote>
        لا خيارات إضافية في هذه المنطقة. أسماء الشحن العادي والاستلام من المتجر مترجمة في إعدادات
        الخادم.
      </PanelNote>
    );
  }
  const data = query.data;
  if (!data) return <PanelState error={query.error} onRetry={() => void query.refetch()} />;

  const fields: TranslationField[] = zone.options.map((option) => ({
    key: option.code,
    label: `اسم «${option.name}»`,
    kind: 'text',
    max: LIMITS.optionName,
    source: option.name,
    hint: `الرمز ${option.code}. فارغ: يظهر الاسم العربي.`,
  }));
  const saved: Saved = Object.fromEntries(
    data.translations.map((t) => [
      t.language,
      {
        values: Object.fromEntries(t.options.map((o) => [o.code, o.name ?? ''])),
        updatedAtUtc: null,
      },
    ]),
  );

  return (
    <TranslationPanel
      fields={fields}
      saved={saved}
      save={(language, v) =>
        put(language, {
          // An option left out keeps its Arabic name.
          options: zone.options.map((option) => ({
            code: option.code,
            name: orNull(v[option.code]),
          })),
        })
      }
      remove={remove}
      onChanged={refresh}
      onDirtyChange={onDirtyChange}
    />
  );
}