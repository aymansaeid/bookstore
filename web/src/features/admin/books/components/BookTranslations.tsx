import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { useSaveShortcut } from '@/features/admin/lib/useSaveShortcut';
import { ApiError } from '@/shared/api/ApiError';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { formatCount, formatDateTime } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { FormAlert, TextAreaField, TextField } from '@/shared/ui/form/Field';
import { toast } from '@/shared/ui/toast/toastStore';

import type { AdminBook } from '../api';
import { useAdminBooks } from '../queries';
import {
  type BookTranslation,
  type BookTranslationInput,
  type BookTranslations as Translations,
  TRANSLATION_LANGUAGES,
  TRANSLATION_LIMITS as LIMITS,
  type TranslationLanguage,
  useBookTranslations,
  useDeleteTranslation,
  useSaveTranslation,
  useSetTransliteration,
} from '../translations';

import styles from './BookTranslations.module.css';

interface Draft {
  title: string;
  subtitle: string;
  author: string;
  description: string;
  editionLabel: string;
  /** One per line: quicker to type and paste than a list editor. */
  highlights: string;
}

type DraftField = keyof Draft;

const draftOf = (saved: BookTranslation | undefined): Draft => ({
  title: saved?.title ?? '',
  subtitle: saved?.subtitle ?? '',
  author: saved?.author ?? '',
  description: saved?.description ?? '',
  editionLabel: saved?.editionLabel ?? '',
  highlights: saved?.highlights.join('\n') ?? '',
});

const lines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');

const orNull = (text: string) => (text.trim() === '' ? null : text.trim());

const inputOf = (draft: Draft): BookTranslationInput => ({
  title: draft.title.trim(),
  subtitle: orNull(draft.subtitle),
  author: orNull(draft.author),
  description: orNull(draft.description),
  editionLabel: orNull(draft.editionLabel),
  highlights: lines(draft.highlights),
});

function check(draft: Draft): Partial<Record<DraftField, string>> {
  const problems: Partial<Record<DraftField, string>> = {};
  if (draft.title.trim() === '') problems.title = 'العنوان مطلوب في الترجمة.';
  const items = lines(draft.highlights);
  if (items.length > LIMITS.highlights) {
    problems.highlights = `${formatCount(LIMITS.highlights)} سطراً على الأكثر، لديك ${formatCount(items.length)}.`;
  } else if (items.some((item) => item.length > LIMITS.highlight)) {
    problems.highlights = `كل سطر ${formatCount(LIMITS.highlight)} حرفاً على الأكثر.`;
  }
  return problems;
}

/** The API's field names ("Title" or "title") → our fields. */
function serverProblems(error: unknown): Partial<Record<DraftField, string>> {
  if (!(error instanceof ApiError) || error.code !== 'Validation') return {};
  const problems: Partial<Record<DraftField, string>> = {};
  for (const [key, messages] of Object.entries(error.fieldErrors)) {
    const field = key.split(/[.[]/)[0]?.toLowerCase();
    const match = (
      ['title', 'subtitle', 'author', 'description', 'editionLabel', 'highlights'] as const
    ).find((name) => name.toLowerCase() === field);
    if (match && messages[0]) problems[match] = 'القيمة غير مقبولة، راجع الطول.';
  }
  return problems;
}

/** One row: the Arabic on one side (read-only, to translate from), the field on the other. */
function Row({ source, children }: { source: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.row}>
      <div className={styles.source} lang="ar" dir="rtl">
        <span className={styles.sourceLabel}>العربية</span>
        <div className={styles.sourceText}>
          {source ?? <span className={styles.none}>— لا يوجد —</span>}
        </div>
      </div>
      <div className={styles.target}>{children}</div>
    </div>
  );
}

interface FormProps {
  bookId: number;
  language: TranslationLanguage;
  source: Translations['source'];
  saved: BookTranslation | undefined;
  active: boolean;
  nextLanguage: TranslationLanguage | null;
  onDirtyChange: (language: TranslationLanguage, dirty: boolean) => void;
  onGoTo: (language: TranslationLanguage) => void;
}

function TranslationForm({
  bookId,
  language,
  source,
  saved,
  active,
  nextLanguage,
  onDirtyChange,
  onGoTo,
}: FormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [initial] = useState(() => draftOf(saved));
  const [draft, setDraft] = useState(initial);
  const [problems, setProblems] = useState<Partial<Record<DraftField, string>>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const goNext = useRef(false);
  const save = useSaveTranslation(bookId, language);
  const remove = useDeleteTranslation(bookId, language);
  const meta = TRANSLATION_LANGUAGES.find((item) => item.code === language);
  const nextMeta = TRANSLATION_LANGUAGES.find((item) => item.code === nextLanguage);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  useEffect(() => {
    onDirtyChange(language, dirty);
  }, [dirty, language, onDirtyChange]);

  useSaveShortcut(formRef, active && dirty);

  const field = (name: DraftField) => ({
    value: draft[name],
    error: problems[name],
    lang: language,
    dir: 'ltr' as const,
    onChange: (event: { target: { value: string } }) => {
      setDraft({ ...draft, [name]: event.target.value });
      if (problems[name]) setProblems({ ...problems, [name]: undefined });
    },
  });

  const highlightCount = lines(draft.highlights).length;

  return (
    <form
      ref={formRef}
      noValidate
      className={styles.form}
      hidden={!active}
      aria-label={`الترجمة ${meta?.label ?? ''}`}
      onSubmit={(event) => {
        event.preventDefault();
        const found = check(draft);
        setProblems(found);
        if (Object.keys(found).length > 0) return;
        const thenGo = goNext.current;
        goNext.current = false;
        save.mutate(inputOf(draft), {
          onSuccess: () => {
            toast.success(`حُفظت الترجمة ${meta?.label ?? ''}.`);
            if (thenGo && nextLanguage) onGoTo(nextLanguage);
          },
          onError: (error) => {
            setProblems(serverProblems(error));
          },
        });
      }}
    >
      {save.isError && !(save.error instanceof ApiError && save.error.code === 'Validation') && (
        <FormAlert>{errorMessage(save.error)}</FormAlert>
      )}

      <Row source={source.title}>
        <TextField label="العنوان" maxLength={LIMITS.title} required {...field('title')} />
      </Row>
      <Row source={source.subtitle}>
        <TextField
          label="العنوان الفرعي (اختياري)"
          maxLength={LIMITS.subtitle}
          {...field('subtitle')}
        />
      </Row>
      <Row source={source.author}>
        <TextField
          label="المؤلف (اختياري)"
          hint="فارغ: يظهر الاسم العربي."
          maxLength={LIMITS.author}
          {...field('author')}
        />
      </Row>
      <Row source={source.description || null}>
        <TextAreaField
          label="الوصف (اختياري)"
          rows={8}
          maxLength={LIMITS.description}
          hint={`${formatCount(draft.description.length)} / ${formatCount(LIMITS.description)}`}
          {...field('description')}
        />
      </Row>
      {source.editionLabel && (
        <Row source={source.editionLabel}>
          <TextField
            label="اسم الطبعة (اختياري)"
            maxLength={LIMITS.editionLabel}
            {...field('editionLabel')}
          />
        </Row>
      )}
      {source.highlights.length > 0 && (
        <Row
          source={
            <ol className={styles.sourceList}>
              {source.highlights.map((item, index) => (
                <li key={`${item}-${String(index)}`}>{item}</li>
              ))}
            </ol>
          }
        >
          <TextAreaField
            label={`أبرز الموضوعات، سطر لكل موضوع (${formatCount(highlightCount)} / ${formatCount(source.highlights.length)})`}
            hint="بنفس ترتيب العربية. فارغ: تظهر الموضوعات العربية."
            rows={Math.min(Math.max(source.highlights.length, 3), 12)}
            {...field('highlights')}
          />
        </Row>
      )}

      <div className={styles.bar}>
        <span className={styles.state} aria-live="polite">
          {dirty ? (
            <b className={styles.dirty}>تغييرات غير محفوظة</b>
          ) : saved ? (
            `آخر حفظ ${formatDateTime(saved.updatedAtUtc)}`
          ) : (
            'لم تُترجم بعد'
          )}
        </span>
        <div className={styles.barButtons}>
          {saved && (
            <Button
              variant="ghost"
              size="sm"
              className={cx(confirmDelete && styles.confirm)}
              disabled={remove.isPending}
              onClick={() => {
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  return;
                }
                remove.mutate();
              }}
              onBlur={() => {
                setConfirmDelete(false);
              }}
            >
              {confirmDelete ? 'اضغط مجدداً للحذف' : 'حذف الترجمة'}
            </Button>
          )}
          {nextMeta && (
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              disabled={save.isPending}
              onClick={() => {
                goNext.current = true;
              }}
            >
              حفظ ثم {nextMeta.label} ←
            </Button>
          )}
          <Button type="submit" variant="ink" size="sm" disabled={save.isPending}>
            {save.isPending ? 'جارٍ الحفظ…' : 'حفظ'}
            <kbd className={styles.kbd} aria-hidden="true">
              Ctrl S
            </kbd>
          </Button>
        </div>
      </div>
    </form>
  );
}

function TransliterationForm({ bookId, value }: { bookId: number; value: string | null }) {
  const [text, setText] = useState(value ?? '');
  const save = useSetTransliteration(bookId);
  const changed = text.trim() !== (value ?? '');
  return (
    <form
      noValidate
      className={styles.translit}
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate(orNull(text));
      }}
    >
      <TextField
        label="العنوان العربي بحروف لاتينية"
        hint="يُبحث به في كل اللغات، مثل Zâd al-Maʿâd. يُكتب مرة واحدة."
        dir="ltr"
        lang="ar-Latn"
        maxLength={LIMITS.transliteration}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
        }}
      />
      <Button type="submit" variant="ghost" size="sm" disabled={!changed || save.isPending}>
        {save.isPending ? 'جارٍ الحفظ…' : 'حفظ'}
      </Button>
    </form>
  );
}

/** The next book (by title) still missing this language, to keep translating without the list. */
function useNextMissing(currentId: number, language: TranslationLanguage): AdminBook | undefined {
  const books = useAdminBooks().data ?? [];
  const missing = books
    .filter((book) => book.id !== currentId && !book.translations.includes(language))
    .sort((a, b) => a.title.localeCompare(b.title, 'ar'));
  return missing[0];
}

/**
 * English and Turkish text for a book (API §2b), next to its Arabic. Both
 * forms stay mounted, so switching tabs never loses typing; the page asks
 * before leaving with unsaved changes.
 */
export function BookTranslations({
  book,
  language,
  onLanguageChange,
  onDirtyChange: reportDirty,
}: {
  book: AdminBook;
  language: TranslationLanguage;
  onLanguageChange: (language: TranslationLanguage) => void;
  /** Either language has unsaved edits. */
  onDirtyChange: (dirty: boolean) => void;
}) {
  const query = useBookTranslations(book.id);
  const [dirty, setDirty] = useState<Record<TranslationLanguage, boolean>>({
    en: false,
    tr: false,
  });
  const [onDirtyChange] = useState(() => (code: TranslationLanguage, value: boolean) => {
    setDirty((old) => (old[code] === value ? old : { ...old, [code]: value }));
  });
  const anyDirty = dirty.en || dirty.tr;
  useEffect(() => {
    reportDirty(anyDirty);
  }, [anyDirty, reportDirty]);
  const next = useNextMissing(book.id, language);

  const data = query.data;
  if (!data) {
    return query.isError ? (
      <div role="alert" className={styles.problem}>
        <p>{errorMessage(query.error)}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            void query.refetch();
          }}
        >
          أعد المحاولة
        </Button>
      </div>
    ) : (
      <div className={styles.loading} aria-busy="true" aria-label="جارٍ تحميل الترجمات" />
    );
  }

  const savedOf = (code: TranslationLanguage) =>
    data.translations.find((item) => item.language === code);
  const currentDone = savedOf(language) !== undefined;

  return (
    <div className={styles.root}>
      <TransliterationForm
        key={data.transliteratedTitle ?? ''}
        bookId={book.id}
        value={data.transliteratedTitle}
      />

      <div className={styles.tabs} role="tablist" aria-label="لغة الترجمة">
        {TRANSLATION_LANGUAGES.map((item) => {
          const done = savedOf(item.code) !== undefined;
          return (
            <button
              key={item.code}
              type="button"
              role="tab"
              id={`tr-tab-${item.code}`}
              aria-selected={language === item.code}
              className={cx(styles.tab, language === item.code && styles.tabOn)}
              onClick={() => {
                onLanguageChange(item.code);
              }}
            >
              <span lang={item.code}>{item.native}</span>
              <span className={cx(styles.status, done ? styles.done : styles.todo)}>
                {dirty[item.code] ? 'غير محفوظة' : done ? 'مترجمة' : 'ناقصة'}
              </span>
            </button>
          );
        })}
      </div>

      {TRANSLATION_LANGUAGES.map((item) => {
        const saved = savedOf(item.code);
        const other = TRANSLATION_LANGUAGES.find((x) => x.code !== item.code)?.code ?? null;
        return (
          <TranslationForm
            // Fresh form after a save or delete: the saved text becomes the new baseline.
            key={`${item.code}|${saved?.updatedAtUtc ?? 'none'}`}
            bookId={book.id}
            language={item.code}
            source={data.source}
            saved={saved}
            active={language === item.code}
            nextLanguage={other && savedOf(other) === undefined ? other : null}
            onDirtyChange={onDirtyChange}
            onGoTo={onLanguageChange}
          />
        );
      })}

      {currentDone && next && (
        <p className={styles.next}>
          <Link to={`${paths.admin.book(next.id)}?lang=${language}#translations`}>
            الكتاب التالي الناقص ترجمته: «{next.title}» ←
          </Link>
        </p>
      )}
    </div>
  );
}